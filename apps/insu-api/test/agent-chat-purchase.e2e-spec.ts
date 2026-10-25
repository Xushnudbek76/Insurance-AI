import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { INestApplication } from '@nestjs/common';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../src/components/auth/auth.service';
import { migratePurchaseOpen } from '../../../scripts/migrate-policy-purchase-open';

describe('Private agent chat and direct purchase (isolated database)', () => {
  let app: INestApplication,
    db: Connection,
    uri: string,
    pkg: any,
    agent: any,
    client: any,
    outsider: any,
    admin: any,
    otherAgent: any;
  let tokens: Record<string, string> = {},
    thread: string,
    policyId: string;
  const future = () => new Date(Date.now() + 86400000).toISOString();
  const end = () => new Date(Date.now() + 370 * 86400000).toISOString();
  async function gql(query: string, variables: any, actor = 'client') {
    const result = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${tokens[actor]}`)
      .send({ query, variables });
    return result.body;
  }
  beforeAll(async () => {
    ConfigModule.forRoot();
    const base = process.env.INSU_TEST_MONGO_URI ?? process.env.MONGO_DEV;
    if (!base)
      throw new Error(
        'Provide INSU_TEST_MONGO_URI or configured MONGO_DEV connection',
      );
    const parsed = new URL(base);
    parsed.pathname = `/insu_agent_chat_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    uri = parsed.toString();
    if (!parsed.pathname.startsWith('/insu_agent_chat_test_') || uri === base)
      throw new Error('Refusing non-isolated test database');
    process.env.NODE_ENV = 'test';
    process.env.MONGO_DEV = uri;
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(getConnectionToken());
    const auth = app.get(AuthService);
    for (const [key, type] of Object.entries({
      agent: 'AGENT',
      client: 'USER',
      outsider: 'USER',
      admin: 'ADMIN',
      otherAgent: 'AGENT',
    })) {
      const record = {
        _id: new Types.ObjectId(),
        memberNick: key,
        memberStatus: 'ACTIVE',
        memberType: type,
        memberPhone: randomUUID(),
        memberImage: '',
        memberAuthType: 'PHONE',
        memberPassword: 'test-only-not-used',
      };
      await db.collection('members').insertOne(record);
      tokens[key] = await auth.createToken(record as any);
      if (key === 'agent') agent = record;
      if (key === 'client') client = record;
      if (key === 'outsider') outsider = record;
      if (key === 'admin') admin = record;
      if (key === 'otherAgent') otherAgent = record;
    }
    pkg = {
      _id: new Types.ObjectId(),
      memberId: agent._id,
      packageName: 'Test Cover',
      packageType: 'AUTO',
      packagePrice: 120,
      packageCoverageLimit: 10000,
      packageStatus: 'ACTIVE',
    };
    await db.collection('packages').insertOne(pkg);
    await db
      .collection('conversations')
      .createIndex({ clientId: 1, agentId: 1, packageId: 1 }, { unique: true });
    await db
      .collection('chatMessages')
      .createIndex(
        { conversationId: 1, senderId: 1, clientMessageId: 1 },
        { unique: true },
      );
    await migratePurchaseOpen(db.collection('policies'), true);
  });
  afterAll(async () => {
    try {
      if (db?.name.startsWith('insu_agent_chat_test_')) await db.dropDatabase();
    } finally {
      await app?.close();
    }
  });
  it('isolates_conversations_and_deduplicates_saved_messages', async () => {
    const query =
      'mutation($packageId:String!) { startPackageConversation(packageId:$packageId) { _id packageName } }';
    const values = await Promise.all([
      gql(query, { packageId: String(pkg._id) }),
      gql(query, { packageId: String(pkg._id) }),
    ]);
    expect(values[0].errors).toBeUndefined();
    thread = values[0].data.startPackageConversation._id;
    expect(values[1].data.startPackageConversation._id).toBe(thread);
    const blocked = await gql(
      'query($id:String!){ getConversation(conversationId:$id){ _id } }',
      { id: thread },
      'outsider',
    );
    expect(blocked.errors).toBeDefined();
    const blockedAdmin = await gql(
      'query($id:String!){ getConversation(conversationId:$id){ _id } }',
      { id: thread },
      'admin',
    );
    expect(blockedAdmin.errors).toBeDefined();
    const send =
      'mutation($id:String!,$request:String!){ sendConversationMessage(conversationId:$id,clientMessageId:$request,text:"Hello agent") { _id text createdAt } }';
    const vars = { id: thread, request: randomUUID() };
    const sent = await Promise.all([gql(send, vars), gql(send, vars)]);
    expect(sent[0].errors).toBeUndefined();
    expect(sent[0].data.sendConversationMessage._id).toBe(
      sent[1].data.sendConversationMessage._id,
    );
    expect(
      await db
        .collection('chatMessages')
        .countDocuments({ conversationId: new Types.ObjectId(thread) }),
    ).toBe(1);
    const history = await gql(
      'query($id:String!){getConversationMessages(conversationId:$id){list{_id text createdAt}}}',
      { id: thread },
      'agent',
    );
    expect(history.data.getConversationMessages.list[0].text).toBe(
      'Hello agent',
    );
  });
  it('read_markers_follow_message_chronology_across_id_sequences', async () => {
    const earlier = new Types.ObjectId('fffffffffffffffffffffff0'),
      later = new Types.ObjectId('000000000000000000000001');
    const now = Date.now();
    await db.collection('chatMessages').insertMany([
      {
        _id: earlier,
        conversationId: new Types.ObjectId(thread),
        senderId: client._id,
        clientMessageId: randomUUID(),
        text: 'Earlier',
        createdAt: new Date(now + 10),
        updatedAt: new Date(now + 10),
      },
      {
        _id: later,
        conversationId: new Types.ObjectId(thread),
        senderId: client._id,
        clientMessageId: randomUUID(),
        text: 'Later',
        createdAt: new Date(now + 20),
        updatedAt: new Date(now + 20),
      },
    ]);
    await gql(
      'mutation($id:String!,$message:String!){markConversationRead(conversationId:$id,messageId:$message){_id}}',
      { id: thread, message: String(earlier) },
      'agent',
    );
    const result = await gql(
      'query($id:String!){getConversation(conversationId:$id){unreadCount}}',
      { id: thread },
      'agent',
    );
    expect(result.data.getConversation.unreadCount).toBe(1);
  });
  it('requires_acceptance_then_agent_confirmation_and_one_policy_under_contention', async () => {
    const send =
      'mutation($id:String!,$start:DateTime!,$end:DateTime!){sendPolicyOffer(conversationId:$id,startDate:$start,endDate:$end){_id purchaseStage policyStatus premiumAmount coverageLimit}}';
    const results = await Promise.all([
      gql(send, { id: thread, start: future(), end: end() }, 'agent'),
      gql(send, { id: thread, start: future(), end: end() }, 'agent'),
    ]);
    expect(results[0].errors).toBeUndefined();
    policyId = results[0].data.sendPolicyOffer._id;
    expect(results[1].data.sendPolicyOffer._id).toBe(policyId);
    expect(results[0].data.sendPolicyOffer).toMatchObject({
      purchaseStage: 'OFFERED',
      policyStatus: 'PENDING',
      premiumAmount: 120,
      coverageLimit: 10000,
    });
    const confirm =
      'mutation($id:String!){confirmPolicyPayment(policyId:$id){_id purchaseStage policyStatus}}';
    expect(
      (await gql(confirm, { id: policyId }, 'agent')).errors,
    ).toBeDefined();
    const get = 'query($id:String!){getPolicyById(policyId:$id){_id}}';
    expect((await gql(get, { id: policyId }, 'admin')).errors).toBeDefined();
    const accept =
      'mutation($id:String!){acceptPolicyOffer(policyId:$id){_id purchaseStage policyStatus}}';
    expect((await gql(accept, { id: policyId }, 'agent')).errors).toBeDefined();
    expect(
      (await gql(accept, { id: policyId })).data.acceptPolicyOffer
        .purchaseStage,
    ).toBe('AWAITING_PAYMENT');
    expect(
      (await gql(confirm, { id: policyId }, 'outsider')).errors,
    ).toBeDefined();
    const confirmed = await Promise.all([
      gql(confirm, { id: policyId }, 'agent'),
      gql(confirm, { id: policyId }, 'agent'),
    ]);
    expect(confirmed.map((r) => r.data.confirmPolicyPayment._id)).toEqual([
      policyId,
      policyId,
    ]);
    expect(
      await db.collection('policies').countDocuments({
        memberId: client._id,
        packageId: pkg._id,
        policyStatus: 'ACTIVE',
      }),
    ).toBe(1);
    expect((await gql(get, { id: policyId }, 'admin')).errors).toBeUndefined();
    const bypass = await gql(
      'mutation($input:PurchasePolicyInput!){purchasePolicy(input:$input){_id}}',
      { input: { packageId: String(pkg._id) } },
    );
    expect(bypass.errors).toBeDefined();
  });
  it('assigned_agent_cannot_submit_a_claim_for_the_client', async () => {
    const policy = await db
      .collection('policies')
      .findOne({ _id: new Types.ObjectId(policyId) });
    await db
      .collection('policies')
      .updateOne(
        { _id: policy!._id },
        { $set: { startDate: new Date(Date.now() - 10000) } },
      );
    const result = await gql(
      'mutation($input:SubmitClaimInput!){submitClaim(input:$input){_id}}',
      {
        input: {
          policyId,
          claimTitle: 'Unauthorized claim',
          claimDesc: 'Agent is not the policy holder',
          claimAmount: 1,
        },
      },
      'agent',
    );
    expect(result.errors?.[0]?.message).toContain('Only the policy holder');
    expect(
      await db
        .collection('claims')
        .countDocuments({ policyId: new Types.ObjectId(policyId) }),
    ).toBe(0);
    await db
      .collection('policies')
      .updateOne(
        { _id: policy!._id },
        { $set: { startDate: policy!.startDate } },
      );
  });
  it('reloads_saved_history_after_application_restart', async () => {
    await app.close();
    const { AppModule } = await import('../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(getConnectionToken());
    const history = await gql(
      'query($id:String!){getConversationMessages(conversationId:$id){list{text}}}',
      { id: thread },
    );
    expect(
      history.data.getConversationMessages.list.map((m: any) => m.text),
    ).toContain('Hello agent');
    const policy = await gql(
      'query($id:String!){getPolicyById(policyId:$id){purchaseStage premiumAmount}}',
      { id: policyId },
    );
    expect(policy.data.getPolicyById).toMatchObject({
      purchaseStage: 'CONFIRMED',
      premiumAmount: 120,
    });
  });
  it('cancellation_releases_slot_and_changed_ownership_cannot_activate', async () => {
    const cancelled = await gql(
      'mutation($id:String!){cancelPolicy(policyId:$id){policyStatus}}',
      { id: policyId },
    );
    expect(cancelled.data.cancelPolicy.policyStatus).toBe('CANCELLED');
    expect(
      (
        await db
          .collection('policies')
          .findOne({ _id: new Types.ObjectId(policyId) })
      )?.purchaseOpen,
    ).toBe(false);
    const offer = await gql(
      'mutation($id:String!,$start:DateTime!,$end:DateTime!){sendPolicyOffer(conversationId:$id,startDate:$start,endDate:$end){_id}}',
      { id: thread, start: future(), end: end() },
      'agent',
    );
    const next = offer.data.sendPolicyOffer._id;
    await db
      .collection('packages')
      .updateOne({ _id: pkg._id }, { $set: { memberId: otherAgent._id } });
    expect(
      (
        await gql(
          'mutation($id:String!){acceptPolicyOffer(policyId:$id){_id}}',
          { id: next },
        )
      ).errors,
    ).toBeDefined();
    expect(
      (
        await gql(
          'mutation($id:String!){declinePolicyOffer(policyId:$id){purchaseStage}}',
          { id: next },
        )
      ).data.declinePolicyOffer.purchaseStage,
    ).toBe('DECLINED');
    await db
      .collection('members')
      .updateOne({ _id: client._id }, { $set: { memberStatus: 'BLOCK' } });
    expect(
      (await gql('query{getMyConversations(page:1,limit:20){total}}', {}))
        .errors,
    ).toBeDefined();
  });
  it('legacy_duplicate_audit_writes_nothing_and_migration_is_idempotent', async () => {
    const collection = db.collection('legacyAudit');
    const memberId = new Types.ObjectId(),
      packageId = new Types.ObjectId();
    await collection.insertMany([
      { memberId, packageId, policyStatus: 'ACTIVE' },
      { memberId, packageId, policyStatus: 'ACTIVE' },
    ]);
    await expect(migratePurchaseOpen(collection, true)).rejects.toThrow(
      'Duplicate',
    );
    expect(
      await collection.countDocuments({ purchaseOpen: { $exists: true } }),
    ).toBe(0);
    const records = await collection.find({}).toArray();
    await collection.updateOne(
      { _id: records[1]._id },
      { $set: { policyStatus: 'CANCELLED' } },
    );
    await migratePurchaseOpen(collection, true);
    await migratePurchaseOpen(collection, true);
    expect(await collection.countDocuments({ purchaseOpen: true })).toBe(1);
  });
});

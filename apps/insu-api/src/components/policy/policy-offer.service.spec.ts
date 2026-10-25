import { PolicyOfferService } from './policy-offer.service';
import { Types } from 'mongoose';
const query = (x: any) => ({
  lean: () => ({ exec: async () => x }),
  exec: async () => x,
});
describe('Agent policy offers', () => {
  const client = new Types.ObjectId(),
    agent = new Types.ObjectId(),
    threadId = new Types.ObjectId();
  let c: any, policy: any, model: any, access: any, service: PolicyOfferService;
  beforeEach(() => {
    c = {
      _id: threadId,
      clientId: client,
      agentId: agent,
      packageId: new Types.ObjectId(),
    };
    policy = {
      _id: new Types.ObjectId(),
      conversationId: threadId,
      memberId: client,
      AgentId: String(agent),
      policyStatus: 'PENDING',
      purchaseStage: 'OFFERED',
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 400 * 86400000),
    };
    model = {
      collection: { indexExists: jest.fn().mockResolvedValue(true) },
      findById: jest.fn().mockImplementation(() => query(policy)),
      findOne: jest.fn().mockReturnValue(query(null)),
      create: jest.fn().mockImplementation(async (x) => x),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation((_filter, update) =>
          query({ ...policy, ...update.$set }),
        ),
    };
    access = {
      requireParticipant: jest.fn().mockResolvedValue(c),
      requireWritableConversation: jest.fn().mockResolvedValue(c),
      requireActiveMember: jest
        .fn()
        .mockImplementation(async (id) => ({ _id: id, memberNick: 'Client' })),
      packages: {
        findById: () =>
          query({
            packageStatus: 'ACTIVE',
            memberId: agent,
            packagePrice: 100,
            packageCoverageLimit: 5000,
            packageName: 'Cover',
          }),
      },
    };
    service = new PolicyOfferService(model, access, {
      notify: jest.fn(),
    } as any);
  });
  it('offer_uses_server_package_snapshot', async () => {
    const result = await service.sendPolicyOffer(
      String(threadId),
      agent,
      policy.startDate,
      policy.endDate,
    );
    expect(result).toMatchObject({
      premiumAmount: 100,
      coverageLimit: 5000,
      purchaseStage: 'OFFERED',
      policyStatus: 'PENDING',
      purchaseOpen: true,
    });
  });
  it('only_client_accepts', async () => {
    await expect(
      service.transition(String(policy._id), agent, 'accept'),
    ).rejects.toThrow();
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('only_assigned_agent_confirms_after_acceptance', async () => {
    await expect(
      service.transition(String(policy._id), agent, 'confirm'),
    ).rejects.toThrow();
    policy.purchaseStage = 'AWAITING_PAYMENT';
    await expect(
      service.transition(String(policy._id), client, 'confirm'),
    ).rejects.toThrow();
    const result = await service.transition(
      String(policy._id),
      agent,
      'confirm',
    );
    expect(result.policyStatus).toBe('ACTIVE');
    expect(result.purchaseStage).toBe('CONFIRMED');
  });
  it('concurrent_confirmation_returns_same_policy', async () => {
    policy.purchaseStage = 'CONFIRMED';
    policy.policyStatus = 'ACTIVE';
    const result = await service.transition(
      String(policy._id),
      agent,
      'confirm',
    );
    expect(result._id).toEqual(policy._id);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('rejects_stale_or_invalid_coverage_dates', async () => {
    await expect(
      service.sendPolicyOffer(
        String(threadId),
        agent,
        new Date(0),
        policy.endDate,
      ),
    ).rejects.toThrow();
    policy.startDate = new Date(0);
    await expect(
      service.transition(String(policy._id), client, 'accept'),
    ).rejects.toThrow();
  });
  it('decline_and_withdraw_release_purchase_slot_even_if_unavailable', async () => {
    access.requireWritableConversation.mockRejectedValue(new Error('archived'));
    const result = await service.transition(
      String(policy._id),
      client,
      'decline',
    );
    expect(result.purchaseOpen).toBe(false);
    expect(result.policyStatus).toBe('INACTIVE');
    expect(access.requireWritableConversation).not.toHaveBeenCalled();
  });
  it('changed_ownership_or_blocked_account_cannot_activate', async () => {
    policy.purchaseStage = 'AWAITING_PAYMENT';
    access.requireWritableConversation.mockRejectedValue(new Error('archived'));
    await expect(
      service.transition(String(policy._id), agent, 'confirm'),
    ).rejects.toThrow('archived');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('accepted_terms_are_immutable', async () => {
    await service.transition(String(policy._id), client, 'accept');
    const update = model.findOneAndUpdate.mock.calls[0][1].$set;
    expect(update).not.toHaveProperty('premiumAmount');
    expect(update).not.toHaveProperty('startDate');
    expect(update).not.toHaveProperty('coverageLimit');
  });
});

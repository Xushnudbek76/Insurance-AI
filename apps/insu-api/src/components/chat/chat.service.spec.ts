import { ChatService } from './chat.service';
import { ChatAccessService } from './chat-access.service';
import { Types } from 'mongoose';
const id = () => new Types.ObjectId();
const query = (value: any) => ({
  lean: () => ({ exec: async () => value }),
  exec: async () => value,
});
describe('Private chat', () => {
  const client = id(),
    agent = id(),
    conversationId = id(),
    packageId = id();
  const conversation = {
    _id: conversationId,
    clientId: client,
    agentId: agent,
    packageId,
  };
  let access: any, conversations: any, messages: any, service: ChatService;
  beforeEach(() => {
    access = {
      requireActiveMember: jest
        .fn()
        .mockResolvedValue({
          _id: client,
          memberStatus: 'ACTIVE',
          memberType: 'AGENT',
        }),
      requireParticipant: jest.fn().mockResolvedValue(conversation),
      requireWritableConversation: jest.fn().mockResolvedValue(conversation),
      getAvailability: jest
        .fn()
        .mockResolvedValue({ writable: true, unavailableReason: null }),
    };
    conversations = {
      findOneAndUpdate: jest.fn().mockReturnValue(query(conversation)),
      findById: jest.fn().mockReturnValue(query(conversation)),
    };
    conversations.updateOne = jest.fn().mockResolvedValue({});
    messages = {
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue(query({ _id: id(), conversationId, text: 'hello' })),
    };
    service = new ChatService(
      conversations,
      messages,
      {
        findById: () =>
          query({ _id: packageId, packageStatus: 'ACTIVE', memberId: agent }),
      } as any,
      access,
      { notify: jest.fn() } as any,
    );
  });
  it('reuses_conversation_on_parallel_start', async () => {
    jest.spyOn(service, 'present').mockImplementation(async (c) => c);
    const values = await Promise.all([
      service.startPackageConversation(packageId.toString(), client),
      service.startPackageConversation(packageId.toString(), client),
    ]);
    expect(values[0]._id).toEqual(values[1]._id);
    expect(conversations.findOneAndUpdate.mock.calls[0][2].upsert).toBe(true);
  });
  it('rejects_empty_or_overlong_text', async () => {
    await expect(
      service.sendConversationMessage(
        conversationId.toString(),
        client,
        'a',
        ' ',
      ),
    ).rejects.toThrow();
    await expect(
      service.sendConversationMessage(
        conversationId.toString(),
        client,
        'a',
        'x'.repeat(2001),
      ),
    ).rejects.toThrow();
    expect(messages.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('deduplicates_message_retry', async () => {
    await service.sendConversationMessage(
      conversationId.toString(),
      client,
      '550e8400-e29b-41d4-a716-446655440000',
      'hello',
    );
    expect(messages.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      senderId: client,
      clientMessageId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(messages.findOneAndUpdate.mock.calls[0][1].$setOnInsert.text).toBe(
      'hello',
    );
  });
  it('rejects_missing_owner_and_self_chat', async () => {
    access.requireActiveMember.mockResolvedValue({
      _id: agent,
      memberStatus: 'ACTIVE',
      memberType: 'AGENT',
    });
    await expect(
      service.startPackageConversation(packageId.toString(), agent),
    ).rejects.toThrow();
  });
  it('rejects_unrelated_participant', async () => {
    const real = new ChatAccessService(
      { findById: () => query({ memberStatus: 'ACTIVE' }) } as any,
      { findById: () => query(conversation) } as any,
      {} as any,
    );
    await expect(
      real.requireParticipant(conversationId, id()),
    ).rejects.toThrow();
  });
  it('rejects_blocked_member_with_valid_token', async () => {
    const real = new ChatAccessService(
      { findById: () => query({ memberStatus: 'BLOCK' }) } as any,
      {} as any,
      {} as any,
    );
    await expect(real.requireActiveMember(client)).rejects.toThrow();
  });
});
describe('Message pagination and read safety', () => {
  it('paginates_equal_timestamps_without_gaps', async () => {
    const at = new Date('2026-10-25T00:00:00Z'),
      older = new Types.ObjectId(),
      newer = new Types.ObjectId();
    const find = jest
      .fn()
      .mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: () => ({ exec: async () => [{ _id: older, createdAt: at }] }),
          }),
        }),
      });
    const service = new ChatService(
      {} as any,
      { find } as any,
      {} as any,
      { requireParticipant: async () => ({}) } as any,
      {} as any,
    );
    const before = Buffer.from(JSON.stringify({ at, id: newer })).toString(
      'base64url',
    );
    const result = await service.getConversationMessages(
      new Types.ObjectId().toString(),
      older,
      before,
      30,
    );
    expect(find.mock.calls[0][0].$or[1]).toEqual({
      createdAt: at,
      _id: { $lt: newer },
    });
    expect(result.list.map((m: any) => m._id)).toEqual([older]);
  });
  it('read_marker_never_moves_backwards', async () => {
    const member = new Types.ObjectId(),
      messageId = new Types.ObjectId(),
      thread = { _id: new Types.ObjectId(), clientId: member };
    const updateOne = jest.fn().mockResolvedValue({});
    const service = new ChatService(
      { updateOne } as any,
      {
        findOne: () =>
          query({ _id: messageId, createdAt: new Date('2026-01-01') }),
      } as any,
      {} as any,
      { requireParticipant: async () => thread } as any,
      { notify: jest.fn() } as any,
    );
    jest.spyOn(service, 'getConversation').mockResolvedValue({});
    await service.markConversationRead(
      thread._id.toString(),
      member,
      messageId.toString(),
    );
    expect(updateOne.mock.calls[0][1]).toEqual({
      $set: {
        clientLastReadMessageId: messageId,
        clientLastReadAt: new Date('2026-01-01'),
      },
    });
    expect(updateOne.mock.calls[0][0].$or).toContainEqual({
      clientLastReadAt: { $lt: new Date('2026-01-01') },
    });
  });
});

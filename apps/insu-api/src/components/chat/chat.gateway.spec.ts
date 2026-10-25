import { ChatGateway } from './chat.gateway';
import { ChatUpdatesService } from './chat-updates.service';
describe('Private chat updates', () => {
  it('rejects_anonymous_expired_and_blocked_connections', async () => {
    const access = {
      requireActiveMember: jest.fn().mockRejectedValue(new Error('blocked')),
    };
    const auth = {
      verifyToken: jest.fn().mockRejectedValue(new Error('expired')),
    };
    const gateway = new ChatGateway(
      auth as any,
      access as any,
      new ChatUpdatesService(),
    );
    const client: any = {
      handshake: { auth: {} },
      disconnect: jest.fn(),
      join: jest.fn(),
    };
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    client.handshake.auth.token = 'expired';
    await gateway.handleConnection(client);
    expect(client.join).not.toHaveBeenCalled();
    auth.verifyToken.mockResolvedValue({ _id: 'member' } as never);
    await gateway.handleConnection(client);
    expect(access.requireActiveMember).toHaveBeenCalledWith('member');
    expect(client.join).not.toHaveBeenCalled();
  });
  it('never_broadcasts_to_other_clients_and_emits_only_conversation_id', () => {
    const updates = new ChatUpdatesService(),
      emit = jest.fn(),
      to = jest.fn().mockReturnValue({ emit });
    updates.server = { to } as any;
    updates.notify({
      _id: 'thread',
      clientId: 'client',
      agentId: 'agent',
      text: 'private',
    });
    expect(to).toHaveBeenCalledWith(['member:client', 'member:agent']);
    expect(emit).toHaveBeenCalledWith('conversation:updated', {
      conversationId: 'thread',
    });
  });
});

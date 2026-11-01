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
      handshake: { headers: {} },
      disconnect: jest.fn(),
      join: jest.fn(),
    };
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    client.handshake.headers.cookie = 'insu-session=expired';
    await gateway.handleConnection(client);
    expect(client.join).not.toHaveBeenCalled();
    auth.verifyToken.mockResolvedValue({ _id: 'member' } as never);
    await gateway.handleConnection(client);
    expect(access.requireActiveMember).toHaveBeenCalledWith('member');
    expect(client.join).not.toHaveBeenCalled();
  });
  it('disconnects all member sockets when an account or password invalidates sessions', () => {
    const { Subject } = require('rxjs');
    const revokedMembers = new Subject();
    const disconnected: string[] = [];
    const gateway = new ChatGateway(
      { revokedMembers } as any,
      {} as any,
      new ChatUpdatesService(),
    );
    gateway.afterInit({
      in: (room: string) => ({
        disconnectSockets: () => disconnected.push(room),
      }),
    } as any);
    revokedMembers.next('member-one');
    expect(disconnected).toEqual(['member:member-one']);
  });
  it('rejects a session revoked while a connection is joining its rooms', async () => {
    const auth = {
      verifyToken: jest
        .fn()
        .mockResolvedValueOnce({ _id: 'member', sessionId: 'session' })
        .mockRejectedValue(new Error('revoked')),
    };
    const gateway = new ChatGateway(
      auth as any,
      { requireActiveMember: async () => ({}) } as any,
      new ChatUpdatesService(),
    );
    const client: any = {
      handshake: { headers: { cookie: 'insu-session=token' } },
      join: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    };
    await gateway.handleConnection(client);
    expect(client.join).toHaveBeenCalledWith('session:session');
    expect(client.join).not.toHaveBeenCalledWith('member:member');
    expect(client.disconnect).toHaveBeenCalledWith(true);
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

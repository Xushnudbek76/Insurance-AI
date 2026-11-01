import { SocketGateway } from './socket.gateway';

describe('Public community chat privacy', () => {
  it('publishes only a public sender profile, including history', async () => {
    const member: any = {
      _id: 'user-id',
      memberNick: 'client',
      memberImage: 'avatar.jpg',
      memberPhone: 'private-phone',
      memberAddress: 'private-address',
      exp: 9999999999,
      authorization: 'private-token',
    };
    const gateway = new SocketGateway({
      verifyToken: async () => member,
    } as any);
    const events: any[] = [];
    gateway.server = {
      emit: (_name: string, payload: any) => events.push(payload),
    } as any;
    const client: any = {
      id: 'socket-one',
      handshake: { headers: { cookie: 'insu-session=test' } },
      emit: (_name: string, payload: any) => events.push(payload),
      data: {},
    };
    await gateway.handleConnection(client);
    await gateway.handleMessage('Hello', client);
    await gateway.handleConnection({
      id: 'anonymous',
      handshake: {},
      emit: (_name: string, payload: any) => events.push(payload),
      data: {},
    } as any);
    expect(JSON.stringify(events)).not.toMatch(
      /private-phone|private-address|private-token/,
    );
    expect(events.find((event) => event.text === 'Hello')?.memberData).toEqual({
      _id: 'user-id',
      memberNick: 'client',
      memberImage: 'avatar.jpg',
    });
    gateway.handleDisconnect(client);
  });
});

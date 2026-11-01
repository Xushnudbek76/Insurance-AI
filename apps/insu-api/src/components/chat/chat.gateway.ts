import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { requestToken } from '../auth/session-security';
import { ChatAccessService } from './chat-access.service';
import { ChatUpdatesService } from './chat-updates.service';
import { socketTransportOptions } from '../../libs/cors';
@WebSocketGateway({
  namespace: '/agent-chat',
  ...socketTransportOptions,
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  constructor(
    private readonly auth: AuthService,
    private readonly access: ChatAccessService,
    private readonly updates: ChatUpdatesService,
  ) {}
  afterInit(server: Server) {
    this.updates.server = server;
    this.auth.revokedSessions?.subscribe((id) =>
      server.in(`session:${id}`).disconnectSockets(true),
    );
    this.auth.revokedMembers?.subscribe((id) =>
      server.in(`member:${id}`).disconnectSockets(true),
    );
  }
  async handleConnection(client: Socket) {
    try {
      const token = requestToken(client.handshake);
      if (typeof token !== 'string' || !token)
        throw new Error('Authentication required');
      const member: any = await this.auth.verifyToken(token);
      if (member.sessionId) await client.join(`session:${member.sessionId}`);
      await this.auth.verifyToken(token);
      await this.access.requireActiveMember(member._id);
      if (client.disconnected) throw new Error('Connection closed');
      await client.join(`member:${member._id}`);
      await this.auth.verifyToken(token);
      if (member.exp) {
        const delay = member.exp * 1000 - Date.now();
        if (delay <= 0) throw new Error('Token expired');
        client.data.expiryTimer = setTimeout(
          () => client.disconnect(true),
          Math.min(delay, 2147483647),
        );
        client.data.expiryTimer.unref?.();
      }
    } catch {
      client.disconnect(true);
    }
  }
  handleDisconnect(client: Socket) {
    clearTimeout(client.data?.expiryTimer);
  }
}

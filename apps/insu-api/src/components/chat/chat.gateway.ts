import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { ChatAccessService } from './chat-access.service';
import { ChatUpdatesService } from './chat-updates.service';
@WebSocketGateway({
  namespace: '/agent-chat',
  cors: { origin: true, credentials: true },
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
  }
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (typeof token !== 'string' || !token)
        throw new Error('Authentication required');
      const member: any = await this.auth.verifyToken(token);
      await this.access.requireActiveMember(member._id);
      await client.join(`member:${member._id}`);
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

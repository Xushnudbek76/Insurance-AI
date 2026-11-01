import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { requestToken } from '../auth/session-security';
import { Member } from '../../libs/dto/member/member';
import { socketTransportOptions } from '../../libs/cors';
type PublicMember = Pick<Member, '_id' | 'memberNick' | 'memberImage'>;
const publicMember = (member: Member | null): PublicMember | null =>
  member
    ? {
        _id: member._id,
        memberNick: member.memberNick,
        memberImage: member.memberImage,
      }
    : null;

interface MessagePayload {
  event: string;
  text: string;
  memberData: PublicMember | null;
}

interface InfoPayload {
  event: string;
  totalClients: number;
  memberData: PublicMember | null;
  action: string;
}

@WebSocketGateway({
  ...socketTransportOptions,
  transports: ['websocket', 'polling'],
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger('SocketGateway');
  private summaryClient = 0;
  private clientsMap = new Map<string, Member | null>();
  private messagesList: MessagePayload[] = [];

  @WebSocketServer()
  server: Server;

  constructor(private authService: AuthService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.authService.revokedSessions?.subscribe((id) =>
      server.in(`session:${id}`).disconnectSockets(true),
    );
    this.authService.revokedMembers?.subscribe((id) =>
      server.in(`member:${id}`).disconnectSockets(true),
    );
  }

  async handleConnection(client: Socket) {
    this.summaryClient++;
    this.logger.log(
      `Client connected: ${client.id} (total: ${this.summaryClient})`,
    );

    const token = requestToken(client.handshake);
    let member: Member | null = null;

    if (token && typeof token === 'string') {
      try {
        member = await this.authService.verifyToken(token);
        this.logger.log(`Authenticated user: ${member.memberNick}`);
      } catch (err) {
        this.logger.warn(`Invalid token for client ${client.id}`);
      }
    }

    this.clientsMap.set(client.id, member);
    if (member?.sessionId) {
      await client.join(`session:${member.sessionId}`);
      await client.join(`member:${member._id}`);
      try {
        await this.authService.verifyToken(token);
      } catch {
        client.disconnect(true);
        return;
      }
    }

    const infoPayload: InfoPayload = {
      event: 'info',
      totalClients: this.summaryClient,
      memberData: publicMember(member),
      action: 'joined',
    };
    this.server.emit('info', infoPayload);

    client.emit('getMessages', {
      event: 'getMessages',
      list: this.messagesList,
    });
  }

  handleDisconnect(client: Socket) {
    this.summaryClient--;
    this.logger.log(
      `Client disconnected: ${client.id} (total: ${this.summaryClient})`,
    );

    const member = this.clientsMap.get(client.id);
    this.clientsMap.delete(client.id);

    const infoPayload: InfoPayload = {
      event: 'info',
      totalClients: this.summaryClient,
      memberData: publicMember(member || null),
      action: 'left',
    };
    this.server.emit('info', infoPayload);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    let member = this.clientsMap.get(client.id);

    if (!member) {
      client.emit('error', { message: 'Please login to send messages' });
      return;
    }

    if (typeof data !== 'string' || !data.trim() || data.length > 2000) {
      client.emit('error', {
        message: 'Message must contain 1–2000 characters',
      });
      return;
    }
    try {
      const token = requestToken(client.handshake);
      member = await this.authService.verifyToken(token);
    } catch {
      client.disconnect(true);
      return;
    }
    const now = Date.now();
    const rate = (client.data.messageRate ??= { since: now, count: 0 });
    if (now - rate.since >= 10_000) {
      rate.since = now;
      rate.count = 0;
    }
    if (++rate.count > 10) {
      client.emit('error', {
        message: 'Please wait before sending more messages',
      });
      return;
    }

    const messagePayload: MessagePayload = {
      event: 'message',
      text: data.trim(),
      memberData: publicMember(member),
    };

    this.messagesList.push(messagePayload);

    if (this.messagesList.length > 100) {
      this.messagesList = this.messagesList.slice(-100);
    }

    this.server.emit('message', messagePayload);
    this.logger.log('Community message delivered');
  }
}

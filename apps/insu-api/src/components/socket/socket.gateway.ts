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
import { Member } from '../../libs/dto/member/member';

interface MessagePayload {
  event: string;
  text: string;
  memberData: Member | null;
}

interface InfoPayload {
  event: string;
  totalClients: number;
  memberData: Member | null;
  action: string;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
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
  }

  async handleConnection(client: Socket) {
    this.summaryClient++;
    this.logger.log(`Client connected: ${client.id} (total: ${this.summaryClient})`);

    const token = client.handshake.auth?.token || client.handshake.query?.token;
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

    const infoPayload: InfoPayload = {
      event: 'info',
      totalClients: this.summaryClient,
      memberData: member,
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
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.summaryClient})`);

    const member = this.clientsMap.get(client.id);
    this.clientsMap.delete(client.id);

    const infoPayload: InfoPayload = {
      event: 'info',
      totalClients: this.summaryClient,
      memberData: member || null,
      action: 'left',
    };
    this.server.emit('info', infoPayload);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ): void {
    const member = this.clientsMap.get(client.id);

    if (!member) {
      client.emit('error', { message: 'Please login to send messages' });
      return;
    }

    const messagePayload: MessagePayload = {
      event: 'message',
      text: data,
      memberData: member,
    };

    this.messagesList.push(messagePayload);

    if (this.messagesList.length > 100) {
      this.messagesList = this.messagesList.slice(-100);
    }

    this.server.emit('message', messagePayload);
    this.logger.log(`Message from ${member.memberNick}: ${data}`);
  }
}

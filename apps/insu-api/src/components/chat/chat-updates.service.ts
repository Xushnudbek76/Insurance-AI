import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
@Injectable()
export class ChatUpdatesService {
  server?: Server;
  notify(c: any): void {
    this.server
      ?.to([`member:${c.clientId}`, `member:${c.agentId}`])
      .emit('conversation:updated', { conversationId: String(c._id) });
  }
}

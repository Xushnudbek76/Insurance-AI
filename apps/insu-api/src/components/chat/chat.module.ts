import { ChatGateway } from './chat.gateway';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import ConversationSchema from '../../schemas/Conversation.model';
import ChatMessageSchema from '../../schemas/ChatMessage.model';
import MemberSchema from '../../schemas/Member.model';
import PackageSchema from '../../schemas/Package.model';
import { AuthModule } from '../auth/auth.module';
import { ChatAccessService } from './chat-access.service';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { ChatUpdatesService } from './chat-updates.service';
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: 'Conversation', schema: ConversationSchema },
      { name: 'ChatMessage', schema: ChatMessageSchema },
      { name: 'Member', schema: MemberSchema },
      { name: 'Package', schema: PackageSchema },
    ]),
  ],
  providers: [
    ChatGateway,
    ChatAccessService,
    ChatService,
    ChatResolver,
    ChatUpdatesService,
  ],
  exports: [ChatAccessService, ChatUpdatesService],
})
export class ChatModule {}

import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import {
  Conversation,
  Conversations,
  ChatMessage,
  ChatMessagePage,
} from '../../libs/dto/chat/chat';
import { ChatService } from './chat.service';
@Resolver()
@UseGuards(AuthGuard)
export class ChatResolver {
  constructor(private readonly service: ChatService) {}
  @Mutation(() => Conversation) startPackageConversation(
    @Args('packageId') id: string,
    @AuthMember('_id') member: any,
  ) {
    return this.service.startPackageConversation(id, member);
  }
  @Query(() => Conversations) getMyConversations(
    @AuthMember('_id') member: any,
    @Args('page', { type: () => Int }) page: number,
    @Args('limit', { type: () => Int }) limit: number,
  ) {
    return this.service.getMyConversations(member, page, limit);
  }
  @Query(() => Conversation) getConversation(
    @Args('conversationId') id: string,
    @AuthMember('_id') member: any,
  ) {
    return this.service.getConversation(id, member);
  }
  @Query(() => ChatMessagePage) getConversationMessages(
    @Args('conversationId') id: string,
    @AuthMember('_id') member: any,
    @Args('before', { type: () => String, nullable: true }) before?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.service.getConversationMessages(id, member, before, limit);
  }
  @Mutation(() => ChatMessage) sendConversationMessage(
    @Args('conversationId') id: string,
    @Args('clientMessageId') request: string,
    @Args('text') text: string,
    @AuthMember('_id') member: any,
  ) {
    return this.service.sendConversationMessage(id, member, request, text);
  }
  @Mutation(() => Conversation) markConversationRead(
    @Args('conversationId') id: string,
    @Args('messageId') message: string,
    @AuthMember('_id') member: any,
  ) {
    return this.service.markConversationRead(id, member, message);
  }
}

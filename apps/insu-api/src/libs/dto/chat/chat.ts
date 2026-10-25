import { Field, Int, ObjectType } from '@nestjs/graphql';
@ObjectType()
export class ChatMember {
  @Field(() => String) _id: any;
  @Field(() => String) memberNick: string;
  @Field(() => String, { nullable: true }) memberImage?: string;
}
@ObjectType()
export class ChatMessage {
  @Field(() => String) _id: any;
  @Field(() => String) conversationId: any;
  @Field(() => String) senderId: any;
  @Field(() => String) clientMessageId: string;
  @Field(() => String) text: string;
  @Field(() => Date) createdAt: Date;
  @Field(() => Date) updatedAt: Date;
}
@ObjectType()
export class Conversation {
  @Field(() => String) _id: any;
  @Field(() => String) clientId: any;
  @Field(() => String) agentId: any;
  @Field(() => String) packageId: any;
  @Field(() => ChatMember, { nullable: true }) client?: ChatMember;
  @Field(() => ChatMember, { nullable: true }) agent?: ChatMember;
  @Field(() => String) packageName: string;
  @Field(() => Int, { nullable: true }) packagePrice?: number;
  @Field(() => Int, { nullable: true }) coverageLimit?: number;
  @Field(() => Int) unreadCount: number;
  @Field(() => ChatMessage, { nullable: true }) lastMessage?: ChatMessage;
  @Field(() => Boolean) writable: boolean;
  @Field(() => String, { nullable: true }) unavailableReason?: string;
  @Field(() => Date) createdAt: Date;
  @Field(() => Date) updatedAt: Date;
}
@ObjectType()
export class Conversations {
  @Field(() => [Conversation]) list: Conversation[];
  @Field(() => Int) total: number;
}
@ObjectType()
export class ChatMessagePage {
  @Field(() => [ChatMessage]) list: ChatMessage[];
  @Field(() => String, { nullable: true }) nextCursor?: string;
}

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { MemberAuthType, MemberStatus, MemberType } from '../enums/member.enum';

@ObjectType()
export class Member {
  @Field(() => String)
  _id: ObjectId | undefined;

  @Field(() => MemberType)
  memberType: MemberType | undefined;

  @Field(() => MemberStatus)
  memberStatus: MemberStatus | undefined;

  @Field(() => MemberAuthType)
  memberAuthType: MemberAuthType | undefined;

  @Field(() => String)
  memberPhone: string | undefined;

  @Field(() => String)
  memberNick: string | undefined;

  memberPassword?: string;

  @Field(() => String, { nullable: true })
  memberFullName?: string;

  @Field(() => String)
  memberImage?: string;

  @Field(() => String, { nullable: true })
  memberAddress?: string;

  @Field(() => String, { nullable: true })
  memberDesc?: string;

  @Field(() => Int)
  memberProperties?: number;

  @Field(() => Int)
  memberArticles?: number;

  @Field(() => Int)
  memberFollowers?: number;

  @Field(() => Int)
  memberFollowings?: number;

  @Field(() => Int)
  memberPoints?: number;

  @Field(() => Int)
  memberLikes?: number;

  @Field(() => Int)
  memberViews?: number;

  @Field(() => Int)
  memberComments?: number;

  @Field(() => Int)
  memberRank?: number;

  @Field(() => Int)
  memberWarnings?: number;

  @Field(() => Int)
  memberBlocks?: number;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String, { nullable: true })
  accessToken?: string;
}

@ObjectType()
export class TotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class Members {
  @Field(() => [Member])
  list: Member[] | undefined;

  @Field(() => [TotalCounter], { nullable: true })
  metaCounter?: TotalCounter;
}

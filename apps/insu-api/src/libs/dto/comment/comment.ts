import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { CommentGroup, CommentStatus } from '../../enums/comment.enum';
import { Member } from '../member/member';

@ObjectType()
export class Comment {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => CommentStatus)
  commentStatus: CommentStatus;

  @Field(() => CommentGroup)
  commentGroup: CommentGroup;

  @Field(() => String)
  commentContent: string;

  @Field(() => String)
  commentRefId: ObjectId;

  @Field(() => String)
  memberId: ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /** from aggregation **/

  @Field(() => Member, { nullable: true })
  memberData?: Member;
}

@ObjectType('CommentTotalCounter')
export class CommentTotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class Comments {
  @Field(() => [Comment])
  list: Comment[];

  @Field(() => [CommentTotalCounter], { nullable: true })
  metaCounter: CommentTotalCounter[];
}

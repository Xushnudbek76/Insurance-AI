import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  BoardArticleCategory,
  BoardArticleStatus,
} from '../../enums/board-article.enum';
import { ObjectId } from 'mongoose';
import { Member, MemberTotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class BoardArticle {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => BoardArticleCategory)
  articleCategory: BoardArticleCategory;

  @Field(() => BoardArticleStatus)
  articleStatus: BoardArticleStatus;

  @Field(() => String)
  articleTitle: string;

  @Field(() => String)
  articleContent: string;

  @Field(() => String, { nullable: true })
  articleImage?: string;

  @Field(() => Int)
  articleViews: number;

  @Field(() => Int)
  articleLikes: number;

  @Field(() => Int)
  articleComments: number;

  @Field(() => String)
  memberId: ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /** from aggregation **/

  @Field(() => [MeLiked], { nullable: true })
  meLiked?: MeLiked[];

  @Field(() => Member, { nullable: true })
  memberData?: Member;
}

@ObjectType()
export class BoardArticles {
  @Field(() => [BoardArticle])
  list: BoardArticle[];

  @Field(() => [MemberTotalCounter], { nullable: true })
  metaCounter: MemberTotalCounter[];
}

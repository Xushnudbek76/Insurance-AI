import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { LikeGroup } from '../../enums/like.enum';

@InputType()
export class OrdinaryInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;
}

@InputType()
export class LikeInput {
  @IsNotEmpty()
  @Field(() => String)
  memberId: ObjectId;

  @IsNotEmpty()
  @Field(() => String)
  likeRefId: ObjectId;

  @IsNotEmpty()
  @Field(() => LikeGroup)
  likeGroup: LikeGroup;
}

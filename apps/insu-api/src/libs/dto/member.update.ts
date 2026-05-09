import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { MemberStatus, MemberType } from '../enums/member.enum';
import type { ObjectId } from 'mongoose';
@InputType()
export class MemberUpdate {
  @IsNotEmpty()
  @Field(() => String)
  _id?: ObjectId;

  @IsOptional()
  @Field(() => MemberType, { nullable: true })
  memberType?: MemberType;

  @IsOptional()
  @Field(() => MemberStatus, { nullable: true })
  memberStatus?: MemberStatus;

  @IsOptional()
  @Field(() => String, { nullable: true })
  memberPhone?: string | undefined;

  @IsOptional()
  @Length(3, 12)
  @Field(() => String, { nullable: true })
  memberNick: string | undefined;

  @IsOptional()
  @Length(5, 12)
  @Field(() => MemberType, { nullable: true })
  memberPassword?: string;

  @IsOptional()
  @Length(3, 100)
  @Field(() => String, { nullable: true })
  memberFullName?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  memberImage?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  memberAddress?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  memberDesc?: string;

  deleteAt?: Date;
}

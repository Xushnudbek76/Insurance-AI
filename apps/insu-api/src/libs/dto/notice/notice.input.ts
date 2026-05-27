import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { NoticeCategory, NoticeStatus } from '../../enums/notice.enum';

export const availableNoticeSorts = ['createdAt', 'updatedAt'];

@InputType()
export class NoticeInput {
  @IsNotEmpty()
  @IsEnum(NoticeCategory)
  @Field(() => NoticeCategory)
  noticeCategory: NoticeCategory;

  @IsNotEmpty()
  @Length(2, 120)
  @Field(() => String)
  noticeTitle: string;

  @IsNotEmpty()
  @Length(2, 2000)
  @Field(() => String)
  noticeContent: string;

  memberId?: ObjectId;
}

@InputType()
class NoticeSearch {
  @IsOptional()
  @IsEnum(NoticeStatus)
  @Field(() => NoticeStatus, { nullable: true })
  noticeStatus?: NoticeStatus;

  @IsOptional()
  @IsEnum(NoticeCategory)
  @Field(() => NoticeCategory, { nullable: true })
  noticeCategory?: NoticeCategory;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class NoticesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableNoticeSorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @IsEnum(Direction)
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => NoticeSearch)
  search: NoticeSearch;
}

@InputType()
export class AllNoticesInquiry extends NoticesInquiry {}

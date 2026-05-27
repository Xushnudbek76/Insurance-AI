import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { FaqCategory, FaqStatus } from '../../enums/faq.enum';

export const availableFaqSorts = ['faqOrder', 'createdAt', 'updatedAt'];

@InputType()
export class FaqInput {
  @IsNotEmpty()
  @IsEnum(FaqCategory)
  @Field(() => FaqCategory)
  faqCategory: FaqCategory;

  @IsNotEmpty()
  @Length(2, 180)
  @Field(() => String)
  faqQuestion: string;

  @IsNotEmpty()
  @Length(2, 2000)
  @Field(() => String)
  faqAnswer: string;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  faqOrder?: number;

  memberId?: ObjectId;
}

@InputType()
class FaqSearch {
  @IsOptional()
  @IsEnum(FaqStatus)
  @Field(() => FaqStatus, { nullable: true })
  faqStatus?: FaqStatus;

  @IsOptional()
  @IsEnum(FaqCategory)
  @Field(() => FaqCategory, { nullable: true })
  faqCategory?: FaqCategory;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class FaqsInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableFaqSorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @IsEnum(Direction)
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => FaqSearch)
  search: FaqSearch;
}

@InputType()
export class AllFaqsInquiry extends FaqsInquiry {}

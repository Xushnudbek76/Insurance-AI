import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { FaqCategory, FaqStatus } from '../../enums/faq.enum';

@InputType()
export class FaqUpdate {
  @IsNotEmpty()
  @Field(() => String)
  _id: ObjectId;

  @IsOptional()
  @IsEnum(FaqCategory)
  @Field(() => FaqCategory, { nullable: true })
  faqCategory?: FaqCategory;

  @IsOptional()
  @IsEnum(FaqStatus)
  @Field(() => FaqStatus, { nullable: true })
  faqStatus?: FaqStatus;

  @IsOptional()
  @Length(2, 180)
  @Field(() => String, { nullable: true })
  faqQuestion?: string;

  @IsOptional()
  @Length(2, 2000)
  @Field(() => String, { nullable: true })
  faqAnswer?: string;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  faqOrder?: number;
}

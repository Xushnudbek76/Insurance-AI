import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { FaqCategory, FaqStatus } from '../../enums/faq.enum';

@ObjectType()
export class Faq {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => FaqCategory)
  faqCategory: FaqCategory;

  @Field(() => FaqStatus)
  faqStatus: FaqStatus;

  @Field(() => String)
  faqQuestion: string;

  @Field(() => String)
  faqAnswer: string;

  @Field(() => Int)
  faqOrder: number;

  @Field(() => String)
  memberId: ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType('FaqTotalCounter')
export class FaqTotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class Faqs {
  @Field(() => [Faq])
  list: Faq[];

  @Field(() => [FaqTotalCounter], { nullable: true })
  metaCounter?: FaqTotalCounter[];
}

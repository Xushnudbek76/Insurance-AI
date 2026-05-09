import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { PolicyStatus } from '../../enums/policy.enum';

@ObjectType()
export class Policy {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => PolicyStatus)
  policyStatus: PolicyStatus;

  @Field(() => String)
  memberId: ObjectId;

  @Field(() => String)
  packageId: ObjectId;

  @Field(() => String)
  memberNick: string;

  @Field(() => String)
  packageName: string;

  @Field(() => Int)
  premiumAmount: number;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date)
  endDate: Date;

  @Field(() => Date, { nullable: true })
  cancelledAt?: Date;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType('PolicyTotalCounter')
export class PolicyTotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class Policies {
  @Field(() => [Policy])
  list: Policy[];

  @Field(() => [PolicyTotalCounter], { nullable: true })
  metaCounter?: PolicyTotalCounter[];
}

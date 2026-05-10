import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Direction } from '../../enums/common.enum';
import { PolicyStatus } from '../../enums/policy.enum';

export const availablePolicySorts = [
  'createdAt',
  'updatedAt',
  'premiumAmount',
  'startDate',
  'endDate',
];

@InputType()
export class PurchasePolicyInput {
  @IsNotEmpty()
  @Field(() => String)
  packageId: string;

}

@InputType()
class MyPolicySearch {
  @IsOptional()
  @Field(() => PolicyStatus, { nullable: true })
  policyStatus?: PolicyStatus;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class MyPoliciesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePolicySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => MyPolicySearch)
  search: MyPolicySearch;
}

@InputType()
class AllPolicySearch {
  @IsOptional()
  @Field(() => PolicyStatus, { nullable: true })
  policyStatus?: PolicyStatus;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class AllPoliciesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePolicySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => AllPolicySearch)
  search: AllPolicySearch;
}

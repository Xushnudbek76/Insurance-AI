import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { ClaimStatus } from '../../enums/claim.enum';

@ObjectType()
export class Claim {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => ClaimStatus)
  claimStatus: ClaimStatus;

  @Field(() => String)
  memberId: ObjectId;

  @Field(() => String)
  policyId: ObjectId;

  @Field(() => String)
  claimTitle: string;

  @Field(() => String)
  claimDesc: string;

  @Field(() => String)
  agentId: string;

  @Field(() => Int)
  claimAmount: number;

  @Field(() => [String], { nullable: true })
  claimDocuments?: string[];

  @Field(() => String, { nullable: true })
  aiAnalysis?: string;

  @Field(() => String, { nullable: true })
  agentNote?: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

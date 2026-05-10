import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ClaimStatus } from '../../enums/claim.enum';
import { Direction } from '../../enums/common.enum';

export const availableClaimSorts = ['createdAt', 'updatedAt', 'claimAmount'];

@InputType()
class ClaimSearch {
  @IsOptional()
  @IsEnum(ClaimStatus)
  @Field(() => ClaimStatus, { nullable: true })
  claimStatus?: ClaimStatus;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class AgentClaimsInquiry {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableClaimSorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @IsEnum(Direction)
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @Field(() => ClaimSearch)
  search: ClaimSearch;
}

@InputType()
export class AllClaimsInquiry {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableClaimSorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @IsEnum(Direction)
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @Field(() => ClaimSearch)
  search: ClaimSearch;
}

@InputType()
export class SubmitClaimInput {
  @IsNotEmpty()
  @IsMongoId()
  @Field(() => String)
  policyId: string;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  claimTitle: string;

  @IsNotEmpty()
  @IsString()
  @Field(() => String)
  claimDesc: string;

  @IsNotEmpty()
  @Min(0)
  @Field(() => Int)
  claimAmount: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  claimDocuments?: string[];
}

@InputType()
export class UpdateClaimStatusInput {
  @IsNotEmpty()
  @IsMongoId()
  @Field(() => String)
  claimId: string;

  @IsNotEmpty()
  @IsEnum(ClaimStatus)
  @Field(() => ClaimStatus)
  newStatus: ClaimStatus;
}

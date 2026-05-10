import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ClaimStatus } from '../../enums/claim.enum';

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

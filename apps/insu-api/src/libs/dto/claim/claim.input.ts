import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

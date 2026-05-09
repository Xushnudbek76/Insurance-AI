import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ObjectId } from 'mongoose';
import { PackageCategory, PackageStatus } from '../enums/package.enum';
import { AgentPackagesInquiry, PackagesInquiry } from './package.input';

@InputType()
export class PackageUpdate {
  @IsNotEmpty()
  @Field(() => String)
  _id?: ObjectId;

  @IsOptional()
  @Field(() => PackageCategory, { nullable: true })
  packageCategory?: PackageCategory;

  @IsOptional()
  @Field(() => PackageStatus, { nullable: true })
  packageStatus?: PackageStatus;

  @IsOptional()
  @Field(() => String, { nullable: true })
  packageName?: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  packageDesc?: string;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  packagePrice?: number;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  packageCoverageLimit?: number;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  packageMinAge?: number;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  packageMaxAge?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  packageAssetTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Field(() => [String], { nullable: true })
  packageImages?: string[];
}

@InputType()
export class AllPackagesInquiry extends PackagesInquiry {}

@InputType()
export class PackagesByAgentInquiry extends AgentPackagesInquiry {}

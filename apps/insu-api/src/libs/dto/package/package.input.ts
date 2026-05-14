import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Direction } from '../../enums/common.enum';
import { InsuranceType, PackageStatus } from '../../enums/package.enum';

export const availablePackageSorts = [
  'createdAt',
  'updatedAt',
  'packagePrice',
  'packageViews',
  'packageLikes',
  'packageRank',
];

@InputType()
export class PackageInput {
  @IsNotEmpty()
  @Field(() => InsuranceType)
  packageType: InsuranceType;

  @IsNotEmpty()
  @Field(() => String)
  packageName: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  packageDesc?: string;

  @IsNotEmpty()
  @Min(0)
  @Field(() => Int)
  packagePrice: number;

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
class PackageSearch {
  @IsOptional()
  @Field(() => InsuranceType, { nullable: true })
  packageType?: InsuranceType;

  @IsOptional()
  @Field(() => PackageStatus, { nullable: true })
  packageStatus?: PackageStatus;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  priceMin?: number;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  priceMax?: number;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  coverageMin?: number;
}

@InputType()
export class PackagesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePackageSorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => PackageSearch)
  search: PackageSearch;
}

@InputType()
class AgentPackageSearch {
  @IsOptional()
  @Field(() => PackageStatus, { nullable: true })
  packageStatus?: PackageStatus;
}

@InputType()
export class AgentPackagesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePackageSorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => AgentPackageSearch)
  search: AgentPackageSearch;
}

@InputType()
export class InsuranceRecommendationInput {
  @ArrayNotEmpty()
  @Field(() => [InsuranceType])
  types: InsuranceType[];

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  age?: number;

  @IsOptional()
  @Min(0)
  @Field(() => Int, { nullable: true })
  budget?: number;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;
}

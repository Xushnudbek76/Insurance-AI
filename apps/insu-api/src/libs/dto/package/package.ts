import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { InsuranceType, PackageStatus } from '../../enums/package.enum';
import { Member } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class Package {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => InsuranceType)
  packageType: InsuranceType;

  @Field(() => PackageStatus)
  packageStatus: PackageStatus;

  @Field(() => String)
  packageName: string;

  @Field(() => String, { nullable: true })
  packageDesc?: string;

  @Field(() => Int)
  packagePrice: number;

  @Field(() => Int, { nullable: true })
  packageCoverageLimit?: number;

  @Field(() => Int, { nullable: true })
  packageMinAge?: number;

  @Field(() => Int, { nullable: true })
  packageMaxAge?: number;

  @Field(() => [String], { nullable: true })
  packageAssetTags?: string[];

  @Field(() => [String], { nullable: true })
  packageImages?: string[];

  @Field(() => Int)
  packageViews?: number;

  @Field(() => Int)
  packageLikes?: number;

  @Field(() => Int)
  packageComments?: number;

  @Field(() => Int)
  packageRank?: number;

  @Field(() => String, { nullable: true })
  memberId?: ObjectId;

  @Field(() => Member, { nullable: true })
  memberData?: Member;

  @Field(() => [MeLiked], { nullable: true })
  meLiked?: MeLiked[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType('PackageTotalCounter')
export class PackageTotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class Packages {
  @Field(() => [Package])
  list: Package[];

  @Field(() => [PackageTotalCounter], { nullable: true })
  metaCounter?: PackageTotalCounter[];
}

@ObjectType()
export class InsuranceRecommendationResult {
  @Field(() => Int)
  riskScore: number;

  @Field(() => String)
  reason: string;

  @Field(() => [Package])
  recommendedPackages: Package[];

  @Field(() => [String], { nullable: true })
  rawFactors?: string[];
}

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { PackageCategory, PackageStatus } from '../enums/package.enum';
import { Member } from './member';

@ObjectType()
export class Package {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => PackageCategory)
  packageCategory: PackageCategory;

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

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class TotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
export class Packages {
  @Field(() => [Package])
  list: Package[];

  @Field(() => [TotalCounter], { nullable: true })
  metaCounter?: TotalCounter[];
}

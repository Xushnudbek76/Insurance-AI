import { Schema } from 'mongoose';
import { PackageCategory, PackageStatus } from '../libs/enums/package.enum';

const PackageSchema = new Schema(
  {
    packageCategory: {
      type: String,
      enum: PackageCategory,
      required: true,
    },
    packageStatus: {
      type: String,
      enum: PackageStatus,
      default: PackageStatus.ACTIVE,
    },
    packageName: {
      type: String,
      required: true,
    },
    packageDesc: {
      type: String,
    },
    packagePrice: {
      type: Number,
      required: true,
    },
    packageCoverageLimit: {
      type: Number,
    },
    packageMinAge: {
      type: Number,
    },
    packageMaxAge: {
      type: Number,
    },
    packageAssetTags: {
      type: [String],
    },
    packageImages: {
      type: [String],
    },
    packageViews: {
      type: Number,
      default: 0,
    },
    packageLikes: {
      type: Number,
      default: 0,
    },
    packageComments: {
      type: Number,
      default: 0,
    },
    packageRank: {
      type: Number,
      default: 0,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
  },
  { timestamps: true, collection: 'packages' },
);

export default PackageSchema;

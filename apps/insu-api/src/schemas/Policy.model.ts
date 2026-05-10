import { Schema } from 'mongoose';
import { PolicyStatus } from '../libs/enums/policy.enum';

const PolicySchema = new Schema(
  {
    policyStatus: {
      type: String,
      enum: PolicyStatus,
      default: PolicyStatus.ACTIVE,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    AgentId: {
      type: String,
      required: true,
    },
    memberNick: {
      type: String,
      required: true,
    },
    packageName: {
      type: String,
      required: true,
    },
    premiumAmount: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    cancelledAt: {
      type: Date,
    },
  },
  { timestamps: true, collection: 'policies' },
);

export default PolicySchema;

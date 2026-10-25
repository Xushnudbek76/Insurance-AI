import { Schema } from 'mongoose';
import { PolicyStatus, PurchaseStage } from '../libs/enums/policy.enum';

const PolicySchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId },
    purchaseStage: { type: String, enum: PurchaseStage },
    purchaseOpen: { type: Boolean },
    coverageLimit: { type: Number },
    offeredAt: Date,
    acceptedAt: Date,
    paymentConfirmedAt: Date,
    paymentConfirmedBy: { type: Schema.Types.ObjectId },
    closedAt: Date,
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

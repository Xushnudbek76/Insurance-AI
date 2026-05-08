import { Schema } from 'mongoose';
import { ClaimStatus } from '../libs/enums/claim.enum';

const ClaimSchema = new Schema(
  {
    claimStatus: {
      type: String,
      enum: ClaimStatus,
      default: ClaimStatus.PENDING,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
    },
    claimTitle: {
      type: String,
      required: true,
    },
    claimDesc: {
      type: String,
    },
    claimAmount: {
      type: Number,
      required: true,
    },
    claimDocuments: {
      type: [String],
    },
    aiAnalysis: {
      type: String,
    },
    agentNote: {
      type: String,
    },
  },
  { timestamps: true, collection: 'claims' },
);

export default ClaimSchema;

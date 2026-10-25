import { Schema } from 'mongoose';
const ConversationSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, required: true },
    agentId: { type: Schema.Types.ObjectId, required: true },
    packageId: { type: Schema.Types.ObjectId, required: true },
    clientLastReadAt: Date,
    agentLastReadAt: Date,
    clientLastReadMessageId: Schema.Types.ObjectId,
    agentLastReadMessageId: Schema.Types.ObjectId,
  },
  { timestamps: true, collection: 'conversations' },
);
ConversationSchema.index(
  { clientId: 1, agentId: 1, packageId: 1 },
  { unique: true },
);
ConversationSchema.index({ agentId: 1, updatedAt: -1 });
ConversationSchema.index({ clientId: 1, updatedAt: -1 });
export default ConversationSchema;

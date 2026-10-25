import { Schema } from 'mongoose';
const ChatMessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    clientMessageId: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true, collection: 'chatMessages' },
);
ChatMessageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true },
);
ChatMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
export default ChatMessageSchema;

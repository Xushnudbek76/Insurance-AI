import { Schema, Types } from 'mongoose';
export interface AuthSession {
  sessionHash: string;
  memberId: Types.ObjectId;
  expiresAt: Date;
}
export default new Schema(
  {
    sessionHash: { type: String, required: true, unique: true },
    memberId: { type: Schema.Types.ObjectId, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { collection: 'auth_sessions', timestamps: true },
);

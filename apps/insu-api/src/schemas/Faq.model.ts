import { Schema } from 'mongoose';
import { FaqCategory, FaqStatus } from '../libs/enums/faq.enum';

const FaqSchema = new Schema(
  {
    faqCategory: {
      type: String,
      enum: FaqCategory,
      required: true,
    },

    faqStatus: {
      type: String,
      enum: FaqStatus,
      default: FaqStatus.ACTIVE,
    },

    faqQuestion: {
      type: String,
      required: true,
    },

    faqAnswer: {
      type: String,
      required: true,
    },

    faqOrder: {
      type: Number,
      default: 0,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },
  },
  { timestamps: true, collection: 'faqs' },
);

export default FaqSchema;

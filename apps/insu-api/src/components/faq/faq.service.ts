import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Direction, Message } from '../../libs/enums/common.enum';
import { FaqStatus } from '../../libs/enums/faq.enum';
import { T } from '../../libs/types/common';
import { AllFaqsInquiry, FaqInput, FaqsInquiry } from '../../libs/dto/faq/faq.input';
import { Faq, Faqs } from '../../libs/dto/faq/faq';
import { FaqUpdate } from '../../libs/dto/faq/faq.update';

@Injectable()
export class FaqService {
  constructor(@InjectModel('Faq') private readonly faqModel: Model<Faq>) {}

  public async createFaqByAdmin(memberId: string, input: FaqInput): Promise<Faq> {
    input.memberId = shapeIntoMongoObjectId(memberId);
    return await this.faqModel.create(input);
  }

  public async getFaqs(input: FaqsInquiry): Promise<Faqs> {
    const match = this.buildMatch(input.search, true);
    const sort = this.buildSort(input.sort, input.direction);

    return this.findFaqs(match, sort, input.page, input.limit);
  }

  public async getAllFaqsByAdmin(input: AllFaqsInquiry): Promise<Faqs> {
    const match = this.buildMatch(input.search, false);
    const sort = this.buildSort(input.sort, input.direction);

    return this.findFaqs(match, sort, input.page, input.limit);
  }

  public async updateFaqByAdmin(input: FaqUpdate): Promise<Faq> {
    const result = await this.faqModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    return result;
  }

  public async removeFaqByAdmin(faqId: string): Promise<Faq> {
    const target = await this.faqModel.findById(faqId).exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if (target.faqStatus === FaqStatus.DELETED) {
      const removed = await this.faqModel.findByIdAndDelete(faqId).exec();
      if (!removed) throw new InternalServerErrorException(Message.REMOVE_FAILED);
      return removed;
    }

    const deleted = await this.faqModel.findByIdAndUpdate(faqId, { faqStatus: FaqStatus.DELETED }, { new: true }).exec();
    if (!deleted) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return deleted;
  }

  private buildMatch(search: FaqsInquiry['search'], publicOnly: boolean): T {
    const match: T = publicOnly ? { faqStatus: FaqStatus.ACTIVE } : {};
    if (!publicOnly && search?.faqStatus) match.faqStatus = search.faqStatus;
    if (search?.faqCategory) match.faqCategory = search.faqCategory;
    if (search?.text) {
      const text = new RegExp(search.text, 'i');
      match.$or = [{ faqQuestion: text }, { faqAnswer: text }];
    }
    return match;
  }

  private buildSort(sort?: string, direction?: Direction): T {
    if (!sort || sort === 'faqOrder') {
      return { faqOrder: direction ?? Direction.ASC, createdAt: Direction.DESC };
    }
    return { [sort]: direction ?? Direction.DESC };
  }

  private async findFaqs(match: T, sort: T, page: number, limit: number): Promise<Faqs> {
    const result = await this.faqModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    return result[0] as Faqs;
  }
}

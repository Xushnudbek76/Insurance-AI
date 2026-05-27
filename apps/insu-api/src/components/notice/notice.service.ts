import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Direction, Message } from '../../libs/enums/common.enum';
import { NoticeStatus } from '../../libs/enums/notice.enum';
import { T } from '../../libs/types/common';
import {
  AllNoticesInquiry,
  NoticeInput,
  NoticesInquiry,
} from '../../libs/dto/notice/notice.input';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';

@Injectable()
export class NoticeService {
  constructor(
    @InjectModel('Notice') private readonly noticeModel: Model<Notice>,
  ) {}

  public async createNoticeByAdmin(
    memberId: string,
    input: NoticeInput,
  ): Promise<Notice> {
    input.memberId = shapeIntoMongoObjectId(memberId);
    return await this.noticeModel.create(input);
  }

  public async getNotices(input: NoticesInquiry): Promise<Notices> {
    const match = this.buildMatch(input.search, true);
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    return this.findNotices(match, sort, input.page, input.limit);
  }

  public async getAllNoticesByAdmin(
    input: AllNoticesInquiry,
  ): Promise<Notices> {
    const match = this.buildMatch(input.search, false);
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    return this.findNotices(match, sort, input.page, input.limit);
  }

  public async updateNoticeByAdmin(input: NoticeUpdate): Promise<Notice> {
    const result = await this.noticeModel
      .findByIdAndUpdate(input._id, input, { new: true })
      .exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    return result;
  }

  public async removeNoticeByAdmin(noticeId: string): Promise<Notice> {
    const target = await this.noticeModel.findById(noticeId).exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if (target.noticeStatus === NoticeStatus.ARCHIVED) {
      const removed = await this.noticeModel.findByIdAndDelete(noticeId).exec();
      if (!removed)
        throw new InternalServerErrorException(Message.REMOVE_FAILED);
      return removed;
    }

    const archived = await this.noticeModel
      .findByIdAndUpdate(
        noticeId,
        { noticeStatus: NoticeStatus.ARCHIVED },
        { new: true },
      )
      .exec();
    if (!archived)
      throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return archived;
  }

  private buildMatch(search: NoticesInquiry['search'], publicOnly: boolean): T {
    const match: T = publicOnly ? { noticeStatus: NoticeStatus.ACTIVE } : {};
    if (!publicOnly && search?.noticeStatus)
      match.noticeStatus = search.noticeStatus;
    if (search?.noticeCategory) match.noticeCategory = search.noticeCategory;
    if (search?.text) {
      const text = new RegExp(search.text, 'i');
      match.$or = [{ noticeTitle: text }, { noticeContent: text }];
    }
    return match;
  }

  private async findNotices(
    match: T,
    sort: T,
    page: number,
    limit: number,
  ): Promise<Notices> {
    const result = await this.noticeModel
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

    return result[0] as Notices;
  }
}

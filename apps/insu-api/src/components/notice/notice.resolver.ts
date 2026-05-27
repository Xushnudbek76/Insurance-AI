import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import {
  AllNoticesInquiry,
  NoticeInput,
  NoticesInquiry,
} from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { NoticeService } from './notice.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class NoticeResolver {
  constructor(private readonly noticeService: NoticeService) {}

  @Query(() => Notices)
  public async getNotices(
    @Args('input') input: NoticesInquiry,
  ): Promise<Notices> {
    return await this.noticeService.getNotices(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Notices)
  public async getAllNoticesByAdmin(
    @Args('input') input: AllNoticesInquiry,
  ): Promise<Notices> {
    return await this.noticeService.getAllNoticesByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Notice)
  public async createNoticeByAdmin(
    @Args('input') input: NoticeInput,
    @AuthMember('_id') memberId: string,
  ): Promise<Notice> {
    return await this.noticeService.createNoticeByAdmin(memberId, input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Notice)
  public async updateNoticeByAdmin(
    @Args('input') input: NoticeUpdate,
  ): Promise<Notice> {
    input._id = shapeIntoMongoObjectId(input._id) as ObjectId;
    return await this.noticeService.updateNoticeByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Notice)
  public async removeNoticeByAdmin(
    @Args('noticeId') noticeId: string,
  ): Promise<Notice> {
    return await this.noticeService.removeNoticeByAdmin(noticeId);
  }
}

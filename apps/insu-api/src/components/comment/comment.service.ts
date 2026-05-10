import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { PackageService } from '../insurance-packages/package.service';
import {
  CommentInput,
  CommentsInquiry,
} from '../../libs/dto/comment/comment.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import {
  Comment as CommentDto,
  Comments,
} from '../../libs/dto/comment/comment';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel('Comment') private readonly commentModel: Model<any>,
    private readonly memberService: MemberService,
    private readonly packageService: PackageService,
  ) {}

  public async createComment(
    memberId: ObjectId,
    input: CommentInput,
  ): Promise<CommentDto> {
    input.memberId = memberId;

    let result = null;

    try {
      result = await this.commentModel.create(input);
    } catch (error) {
      console.log('Error: Service.model:', error);
      throw new BadRequestException(Message.CREATE_FAILED);
    }

    switch (input.commentGroup) {
      case CommentGroup.ARTICLE:
        await this.memberService.memberStatsEditor({
          _id: input.commentRefId,
          targetKey: 'memberArticles',
          modifier: 1,
        });
        break;
      case CommentGroup.PACKAGE:
        await this.packageService.packageStatsEditor({
          _id: input.commentRefId,
          targetKey: 'packageComments',
          modifier: 1,
        });
        break;
    }

    if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
    return result;
  }

  public async updateComment(
    memberId: ObjectId,
    input: CommentUpdate,
  ): Promise<CommentDto> {
    const { _id } = input;
    const result = await this.commentModel.findOneAndUpdate(
      {
        _id: _id,
        memberId: memberId,
        commentStatus: CommentStatus.ACTIVE,
      },
      input,
      {
        new: true,
      },
    );
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    return result;
  }

  public async getComments(
    memberId: ObjectId,
    input: CommentsInquiry,
  ): Promise<Comments> {
    const { commentRefId } = input.search;
    const match: T = {
      commentRefId: commentRefId,
      commentStatus: CommentStatus.ACTIVE,
    };
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    const result: Comments[] = await this.commentModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },

            lookupMember,
            { $unwind: '$memberData' },
          ],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]);

    if (!result.length)
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    return result[0];
  }

  public async removeCommentByAdmin(input: ObjectId): Promise<CommentDto> {
    const result = await this.commentModel.findByIdAndDelete(input);
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return result;
  }
}

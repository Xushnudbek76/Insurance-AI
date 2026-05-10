import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { Package } from '../../libs/dto/package/package';
import { MemberService } from '../member/member.service';
import { PackageService } from '../insurance-packages/package.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { lookupFavorite } from '../../libs/config';

@Injectable()
export class LikeService {
  constructor(
    @InjectModel('Like') private readonly likeModel: Model<any>,
    private readonly memberService: MemberService,
    private readonly packageService: PackageService,
    private readonly boardArticleService: BoardArticleService,
  ) {}

  public async likeTargetPackage(
    memberId: ObjectId,
    likeRefId: ObjectId,
  ): Promise<Package> {
    const modifier = await this.toggleLike({
      memberId,
      likeRefId,
      likeGroup: LikeGroup.PACKAGE,
    });
    await this.packageService.packageStatsEditor({
      _id: likeRefId,
      targetKey: 'packageLikes',
      modifier,
    });
    return this.packageService.getPackage(memberId, likeRefId);
  }

  public async likeTargetBoardArticle(
    memberId: ObjectId,
    likeRefId: ObjectId,
  ): Promise<void> {
    const modifier = await this.toggleLike({
      memberId,
      likeRefId,
      likeGroup: LikeGroup.ARTICLE,
    });
    await this.boardArticleService.boardArticleStatsEditor({
      _id: likeRefId,
      targetKey: 'articleLikes',
      modifier,
    });
  }

  public async likeTargetMember(
    memberId: ObjectId,
    likeRefId: ObjectId,
  ): Promise<void> {
    const modifier = await this.toggleLike({
      memberId,
      likeRefId,
      likeGroup: LikeGroup.MEMBER,
    });
    await this.memberService.memberStatsEditor({
      _id: likeRefId,
      targetKey: 'memberLikes',
      modifier,
    });
  }

  public async getFavoritePackages(memberId: ObjectId): Promise<Package[]> {
    const result = await this.likeModel.aggregate([
      { $match: { memberId, likeGroup: LikeGroup.PACKAGE } },
      {
        $lookup: {
          from: 'packages',
          localField: 'likeRefId',
          foreignField: '_id',
          as: 'packageData',
        },
      },
      { $unwind: '$packageData' },
      { $replaceRoot: { newRoot: '$packageData' } },
      lookupFavorite(memberId),
    ]);

    return result as Package[];
  }

  public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
    const { memberId, likeRefId } = input;
    const result = await this.likeModel.findOne({ memberId, likeRefId }).exec();
    return result ? [{ memberId, likeRefId, myFavorite: true }] : [];
  }

  private async toggleLike(input: LikeInput): Promise<number> {
    const search: T = { memberId: input.memberId, likeRefId: input.likeRefId };
    const exist = await this.likeModel.findOne(search).exec();
    if (exist) {
      await this.likeModel.findOneAndDelete(search).exec();
      return -1;
    }
    try {
      await this.likeModel.create(input);
    } catch (error) {
      console.log('Error, LikeService.model:', error);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
    return 1;
  }
}

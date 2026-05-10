import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { LikeInput, OrdinaryInquiry } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { Package, Packages } from '../../libs/dto/package/package';
import {
  lookupAuthMemberLiked,
  lookupMember,
  shapeIntoMongoObjectId,
} from '../../libs/config';

@Injectable()
export class LikeService {
  constructor(@InjectModel('Like') private readonly likeModel: Model<any>) {}

  public async getFavoritePackages(
    memberId: ObjectId,
    input: OrdinaryInquiry,
  ): Promise<Packages> {
    const { page, limit } = input;
    const match: T = {
      likeGroup: LikeGroup.PACKAGE,
      memberId: shapeIntoMongoObjectId(memberId),
    };

    const data: T = await this.likeModel
      .aggregate([
        { $match: match },
        { $sort: { updatedAt: -1 } },
        {
          $lookup: {
            from: 'packages',
            localField: 'likeRefId',
            foreignField: '_id',
            as: 'favoritePackage',
          },
        },
        { $unwind: '$favoritePackage' },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId, '$favoritePackage._id'),
              lookupMember,
              { $unwind: '$memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    const result: Packages = { list: [], metaCounter: data[0].metaCounter };
    result.list = data[0].list.map((item: T) => {
      item.favoritePackage.meLiked = item.meLiked;
      item.favoritePackage.memberData = item.memberData;
      return item.favoritePackage;
    });
    return result;
  }

  public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
    const { memberId, likeRefId } = input;
    const result = await this.likeModel.findOne({ memberId, likeRefId }).exec();
    return result ? [{ memberId, likeRefId, myFavorite: true }] : [];
  }

  public async toggleLike(input: LikeInput): Promise<number> {
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

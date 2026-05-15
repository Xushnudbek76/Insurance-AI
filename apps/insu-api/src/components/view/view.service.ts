import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { T } from '../../libs/types/common';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { OrdinaryInquiry } from '../../libs/dto/like/like.input';
import { Package, Packages } from '../../libs/dto/package/package';
import {
  lookupAuthMemberLiked,
  lookupMember,
  shapeIntoMongoObjectId,
} from '../../libs/config';

@Injectable()
export class ViewService {
  constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

  public async recordView(input: ViewInput): Promise<View | null> {
    console.log('input:', input);

    const viewExistence = await this.checkViewExistence(input);
    console.log('viewExist:', viewExistence);
    if (!viewExistence) {
      console.log('new view');
      return await this.viewModel.create(input);
    }
    return null;
  }

  public async getVisitedPackages(
    memberId: ObjectId,
    input: OrdinaryInquiry,
  ): Promise<Packages> {
    const { page, limit } = input;
    const match: T = {
      viewGroup: ViewGroup.PACKAGE,
      memberId: shapeIntoMongoObjectId(memberId),
    };

    const data: T = await this.viewModel
      .aggregate([
        { $match: match },
        { $sort: { updatedAt: -1 } },
        {
          $lookup: {
            from: 'packages',
            localField: 'viewRefId',
            foreignField: '_id',
            as: 'visitedPackage',
          },
        },
        { $unwind: '$visitedPackage' },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId, '$visitedPackage._id'),
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
      item.visitedPackage.meLiked = item.meLiked;
      item.visitedPackage.memberData = item.memberData;
      return item.visitedPackage;
    });
    return result;
  }

  private async checkViewExistence(input: ViewInput): Promise<View | null> {
    const { memberId, viewRefId, viewGroup } = input;
    const search: T = {
      memberId: memberId,
      viewRefId: viewRefId,
      viewGroup: viewGroup,
    };
    return await this.viewModel.findOne(search).exec();
  }
}

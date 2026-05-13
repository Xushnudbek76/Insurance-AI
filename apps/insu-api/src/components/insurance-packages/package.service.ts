import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
  AgentPackagesInquiry,
  InsuranceRecommendationInput,
  PackageInput,
  PackagesInquiry,
} from '../../libs/dto/package/package.input';
import {
  AllPackagesInquiry,
  PackageUpdate,
} from '../../libs/dto/package/package.update';
import { Package, Packages } from '../../libs/dto/package/package';
import { Direction, Message } from '../../libs/enums/common.enum';
import { PackageStatus } from '../../libs/enums/package.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import {
  lookupAuthMemberLiked,
  lookupMember,
  shapeIntoMongoObjectId,
} from '../../libs/config';

@Injectable()
export class PackageService {
  constructor(
    @InjectModel('Package') private readonly packageModel: Model<Package>,
    private readonly memberService: MemberService,
    private readonly viewService: ViewService,
    private readonly likeService: LikeService,
  ) {}

  public async createPackage(
    memberId: ObjectId,
    input: PackageInput,
  ): Promise<Package> {
    try {
      return await this.packageModel.create({ ...input, memberId });
    } catch (error) {
      console.log('Error, Service.model:', error);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  public async getPackage(
    memberId: ObjectId,
    packageId: ObjectId,
  ): Promise<Package> {
    const targetPackage = (await this.packageModel
      .findOne({
        _id: packageId,
        packageStatus: PackageStatus.ACTIVE,
      })
      .lean()
      .exec()) as Package | null;

    if (!targetPackage) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    if (memberId) {
      const newView = await this.viewService.recordView({
        memberId,
        viewRefId: packageId,
        viewGroup: ViewGroup.PACKAGE,
      });

      if (newView) {
        await this.packageModel
          .findByIdAndUpdate(
            packageId,
            { $inc: { packageViews: 1 } },
            { new: true },
          )
          .exec();
        targetPackage.packageViews = (targetPackage.packageViews ?? 0) + 1;
      }
      const likeInput = {
        memberId,
        likeRefId: packageId,
        likeGroup: LikeGroup.PACKAGE,
      };
      targetPackage.meLiked =
        await this.likeService.checkLikeExistence(likeInput);
    }

    if (targetPackage.memberId) {
      targetPackage.memberData = await this.memberService.getMember(
        null,
        targetPackage.memberId,
      );
    }

    return targetPackage;
  }

  public async updatePackage(
    memberId: ObjectId,
    input: PackageUpdate,
  ): Promise<Package> {
    const result = await this.packageModel
      .findOneAndUpdate(
        {
          _id: input._id,
          memberId,
          packageStatus: { $ne: PackageStatus.ARCHIVED },
        },
        input,
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InternalServerErrorException(Message.UPDATE_FAILED);
    }

    return result;
  }

  public async getAgentPackages(
    memberId: ObjectId,
    input: AgentPackagesInquiry,
  ): Promise<Packages> {
    const match: T = {
      memberId,
      packageStatus: input.search.packageStatus ?? {
        $ne: PackageStatus.ARCHIVED,
      },
    };
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    return this.findPackages(memberId, match, sort, input.page, input.limit);
  }

  public async getPackages(
    memberId: ObjectId,
    input: PackagesInquiry,
  ): Promise<Packages> {
    const match: T = {
      packageStatus: input.search.packageStatus ?? PackageStatus.ACTIVE,
    };
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    if (input.search.packageType) {
      match.packageType = input.search.packageType;
    }
    if (input.search.text) {
      match.packageName = { $regex: new RegExp(input.search.text, 'i') };
    }

    return this.findPackages(memberId, match, sort, input.page, input.limit);
  }

  public async getAllPackagesByAdmin(
    input: AllPackagesInquiry,
  ): Promise<Packages> {
    const match: T = {};
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    if (input.search.packageStatus) {
      match.packageStatus = input.search.packageStatus;
    }
    if (input.search.packageType) {
      match.packageType = input.search.packageType;
    }
    if (input.search.text) {
      match.packageName = { $regex: new RegExp(input.search.text, 'i') };
    }

    return this.findPackages(null, match, sort, input.page, input.limit);
  }

  public async updatePackageByAdmin(input: PackageUpdate): Promise<Package> {
    const result = await this.packageModel
      .findOneAndUpdate(
        {
          _id: input._id,
        },
        input,
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InternalServerErrorException(Message.UPDATE_FAILED);
    }

    return result;
  }

  public async removePackageByAdmin(packageId: ObjectId): Promise<Package> {
    const result = await this.packageModel
      .findOneAndUpdate(
        { _id: packageId },
        { packageStatus: PackageStatus.ARCHIVED },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InternalServerErrorException(Message.REMOVE_FAILED);
    }

    return result;
  }

  public async getRecommendationCandidates(
    input: InsuranceRecommendationInput,
  ): Promise<Package[]> {
    const match = this.buildRecommendationMatch(input);

    return await this.packageModel
      .find(match)
      .sort({
        packageRank: Direction.DESC,
        packageViews: Direction.DESC,
        createdAt: Direction.DESC,
      })
      .limit(15)
      .lean()
      .exec();
  }

  public async populateMemberData(packages: Package[]): Promise<Package[]> {
    await Promise.all(
      packages.map(async (targetPackage) => {
        if (!targetPackage.memberId) return;

        try {
          targetPackage.memberData = await this.memberService.getMember(
            null,
            targetPackage.memberId,
          );
        } catch (error) {
          targetPackage.memberData = undefined;
        }
      }),
    );

    return packages;
  }

  private async findPackages(
    memberId: ObjectId | null,
    match: T,
    sort: T,
    page: number,
    limit: number,
  ): Promise<Packages> {
    const result = await this.packageModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            lookupAuthMemberLiked(memberId),
            lookupMember,
            { $unwind: '$memberData' },
          ],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]);

    if (!result.length) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    return result[0] as Packages;
  }

  private buildRecommendationMatch(input: InsuranceRecommendationInput): T {
    const clauses: T[] = [
      { packageStatus: PackageStatus.ACTIVE },
      { packageType: { $in: input.types } },
    ];

    if (input.age !== undefined) {
      clauses.push({
        $or: [
          { packageMinAge: { $exists: false } },
          { packageMinAge: null },
          { packageMinAge: { $lte: input.age } },
        ],
      });
      clauses.push({
        $or: [
          { packageMaxAge: { $exists: false } },
          { packageMaxAge: null },
          { packageMaxAge: { $gte: input.age } },
        ],
      });
    }

    if (input.budget !== undefined) {
      clauses.push({
        packagePrice: { $lte: input.budget },
      });
    }

    return clauses.length === 1 ? clauses[0] : { $and: clauses };
  }

  public async likeTargetPackage(
    memberId: ObjectId,
    likeRefId: ObjectId,
  ): Promise<Package> {
    const target = await this.packageModel
      .findOne({ _id: likeRefId, packageStatus: PackageStatus.ACTIVE })
      .exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      memberId,
      likeRefId,
      likeGroup: LikeGroup.PACKAGE,
    };
    const modifier = await this.likeService.toggleLike(input);
    await this.packageStatsEditor({
      _id: likeRefId,
      targetKey: 'packageLikes',
      modifier,
    });
    return this.getPackage(memberId, likeRefId);
  }

  public async packageStatsEditor(
    input: StatisticModifier,
  ): Promise<Package | null> {
    const { _id, targetKey, modifier } = input;
    return await this.packageModel
      .findOneAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
      .exec();
  }
}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
  AgentPackagesInquiry,
  PackageInput,
  PackagesInquiry,
} from '../../libs/dto/package.input';
import {
  AllPackagesInquiry,
  PackageUpdate,
} from '../../libs/dto/package.update';
import { Package, Packages } from '../../libs/dto/package';
import { Direction, Message } from '../../libs/enums/common.enum';
import { PackageStatus } from '../../libs/enums/package.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { T } from '../../libs/types/common';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';

@Injectable()
export class PackageService {
  constructor(
    @InjectModel('Package') private readonly packageModel: Model<Package>,
    private readonly memberService: MemberService,
    private readonly viewService: ViewService,
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
    }

    if (targetPackage.memberId) {
      targetPackage.memberData = await this.memberService.getMember(
        null as any,
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

    return this.findPackages(match, sort, input.page, input.limit);
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

    if (input.search.packageCategory) {
      match.packageCategory = input.search.packageCategory;
    }
    if (input.search.text) {
      match.packageName = { $regex: new RegExp(input.search.text, 'i') };
    }

    const result = await this.findPackages(
      match,
      sort,
      input.page,
      input.limit,
    );
    await this.attachMemberData(result.list, memberId);
    return result;
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
    if (input.search.packageCategory) {
      match.packageCategory = input.search.packageCategory;
    }
    if (input.search.text) {
      match.packageName = { $regex: new RegExp(input.search.text, 'i') };
    }

    return this.findPackages(match, sort, input.page, input.limit);
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

  private async findPackages(
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
          list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]);

    if (!result.length) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    return result[0] as Packages;
  }

  private async attachMemberData(
    packages: Package[],
    memberId: ObjectId,
  ): Promise<void> {
    await Promise.all(
      packages.map(async (targetPackage) => {
        if (!targetPackage.memberId) {
          return;
        }

        targetPackage.memberData = await this.memberService.getMember(
          null as any,
          targetPackage.memberId,
        );
      }),
    );
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
  AllPoliciesInquiry,
  MyPoliciesInquiry,
} from '../../libs/dto/policy/policy.input';
import { Policy, Policies } from '../../libs/dto/policy/policy';
import { Package } from '../../libs/dto/package/package';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { PackageStatus } from '../../libs/enums/package.enum';
import { PolicyStatus } from '../../libs/enums/policy.enum';
import { T } from '../../libs/types/common';

@Injectable()
export class PolicyService {
  constructor(
    @InjectModel('Policy') private readonly policyModel: Model<Policy>,
    @InjectModel('Package') private readonly packageModel: Model<Package>,
  ) {}

  public async purchasePolicy(
    memberId: ObjectId,
    memberNick: string,
    packageId: ObjectId,
  ): Promise<Policy> {
    const targetPackage = await this.packageModel
      .findOne({
        _id: packageId,
        packageStatus: PackageStatus.ACTIVE,
      })
      .lean()
      .exec();

    if (!targetPackage) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    const existingPolicy = await this.policyModel
      .findOne({
        memberId,
        packageId,
        policyStatus: PolicyStatus.ACTIVE,
      })
      .lean()
      .exec();

    if (existingPolicy) {
      throw new BadRequestException(Message.ACTIVE_POLICY_ALREADY_EXISTS);
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    return await this.policyModel.create({
      memberId,
      packageId,
      memberNick,
      packageName: targetPackage.packageName,
      premiumAmount: targetPackage.packagePrice,
      AgentId: `${targetPackage.memberId}`,
      startDate,
      endDate,
      policyStatus: PolicyStatus.ACTIVE,
    });
  }

  public async getMyPolicies(
    memberId: ObjectId,
    input: MyPoliciesInquiry,
  ): Promise<Policies> {
    const match: T = { memberId };

    if (input.search.policyStatus) {
      match.policyStatus = input.search.policyStatus;
    }
    if (input.search.text) {
      match.packageName = { $regex: new RegExp(input.search.text, 'i') };
    }

    return await this.findPolicies(match, input.page, input.limit, {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    });
  }

  public async getPolicyById(
    policyId: ObjectId,
    memberId: ObjectId,
    memberType: MemberType,
  ): Promise<Policy> {
    const targetPolicy = await this.policyModel.findById(policyId).exec();

    if (!targetPolicy) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    if (
      memberType !== MemberType.ADMIN &&
      `${targetPolicy.memberId}` !== `${memberId}`
    ) {
      throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);
    }

    return targetPolicy;
  }

  public async cancelPolicy(
    policyId: ObjectId,
    memberId: ObjectId,
    memberType: MemberType,
  ): Promise<Policy> {
    const targetPolicy = await this.policyModel.findById(policyId).exec();

    if (!targetPolicy) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    if (
      memberType !== MemberType.ADMIN &&
      `${targetPolicy.memberId}` !== `${memberId}`
    ) {
      throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);
    }

    if (targetPolicy.policyStatus !== PolicyStatus.ACTIVE) {
      throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
    }

    const result = await this.policyModel
      .findByIdAndUpdate(
        policyId,
        {
          policyStatus: PolicyStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new InternalServerErrorException(Message.UPDATE_FAILED);
    }

    return result;
  }

  public async adminGetAllPolicies(
    input: AllPoliciesInquiry,
  ): Promise<Policies> {
    const match: T = {};

    if (input.search.policyStatus) {
      match.policyStatus = input.search.policyStatus;
    }
    if (input.search.text) {
      const textRegex = new RegExp(input.search.text, 'i');
      match.$or = [
        { memberNick: { $regex: textRegex } },
        { packageName: { $regex: textRegex } },
      ];
    }

    return await this.findPolicies(match, input.page, input.limit, {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    });
  }

  private async findPolicies(
    match: T,
    page: number,
    limit: number,
    sort: T,
  ): Promise<Policies> {
    const result = await this.policyModel.aggregate([
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

    return result[0] as Policies;
  }
}

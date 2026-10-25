import { ChatAccessService } from '../chat/chat-access.service';
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
    private readonly access: ChatAccessService,
  ) {}

  public async purchasePolicy(
    memberId: ObjectId,
    memberNick: string,
    packageId: ObjectId,
  ): Promise<Policy> {
    throw new BadRequestException(
      'Please chat with the agent to purchase this insurance.',
    );
  }

  public async getMyPolicies(
    memberId: ObjectId,
    input: MyPoliciesInquiry,
  ): Promise<Policies> {
    await this.access.requireActiveMember(memberId);
    const match: T = {
      memberId,
      purchaseStage: { $nin: ['OFFERED', 'DECLINED', 'WITHDRAWN'] },
    };

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
    await this.access.requireActiveMember(memberId);
    const targetPolicy = await this.policyModel.findById(policyId).exec();

    if (!targetPolicy) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    const linked = !!targetPolicy.conversationId;
    const assignedAgent = linked && `${targetPolicy.AgentId}` === `${memberId}`;
    const issued = !linked || !!targetPolicy.paymentConfirmedAt;
    if (
      `${targetPolicy.memberId}` !== `${memberId}` &&
      !assignedAgent &&
      !(memberType === MemberType.ADMIN && issued)
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
    await this.access.requireActiveMember(memberId);
    const targetPolicy = await this.policyModel.findById(policyId).exec();

    if (!targetPolicy) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    if (
      memberType !== MemberType.ADMIN &&
      String(targetPolicy.memberId) !== String(memberId)
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
          purchaseOpen: false,
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
    const match: T = {
      $or: [
        { conversationId: { $exists: false } },
        { paymentConfirmedAt: { $ne: null } },
      ],
    };

    if (input.search.policyStatus) {
      match.policyStatus = input.search.policyStatus;
    }
    if (input.search.text) {
      const textRegex = new RegExp(input.search.text, 'i');
      match.$and = [
        {
          $or: [
            { memberNick: { $regex: textRegex } },
            { packageName: { $regex: textRegex } },
          ],
        },
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

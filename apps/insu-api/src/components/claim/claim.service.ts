import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Claim } from '../../libs/dto/claim/claim';
import { Model } from 'mongoose';
import { SubmitClaimInput } from '../../libs/dto/claim/claim.input';
import { PolicyService } from '../policy/policy.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ClaimStatus } from '../../libs/enums/claim.enum';
import { PolicyStatus } from '../../libs/enums/policy.enum';
import { Message } from '../../libs/enums/common.enum';
import { OpenRouterService } from '../ai/openrouter.service';
@Injectable()
export class ClaimService {
  constructor(
    @InjectModel('Claim') private readonly claimModel: Model<Claim>,
    @InjectModel('Package') private readonly packageModel: Model<any>,
    private readonly openRouterService: OpenRouterService,
    private readonly policyService: PolicyService,
  ) {}

  public async submitClaim(
    memberId: string,
    input: SubmitClaimInput,
  ): Promise<Claim> {
    const id = shapeIntoMongoObjectId(input.policyId);
    const memberIdObj = shapeIntoMongoObjectId(memberId);
    const policy = await this.policyService.getPolicyById(
      id,
      memberIdObj,
      null as any,
    );
    if (!policy) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    if (policy.policyStatus !== PolicyStatus.ACTIVE) {
      throw new BadRequestException('Only active policies can submit claims');
    }

    const existingClaim = await this.claimModel
      .findOne({
        memberId: memberIdObj,
        policyId: id,
        claimStatus: ClaimStatus.PENDING,
      })
      .lean()
      .exec();

    if (existingClaim) {
      throw new BadRequestException(
        'Pending claim already exists for this policy',
      );
    }

    const targetPackage = await this.packageModel
      .findById(policy.packageId)
      .lean()
      .exec();

    if (
      targetPackage?.packageCoverageLimit &&
      input.claimAmount > targetPackage.packageCoverageLimit
    ) {
      throw new BadRequestException(
        `Claim amount exceeds coverage limit of ${targetPackage.packageCoverageLimit}`,
      );
    }

    const aiAnalysis = await this.openRouterService.analyzeClaim({
      claimTitle: input.claimTitle,
      claimDesc: input.claimDesc,
      claimAmount: input.claimAmount,
      policyStartDate: policy.startDate,
      policyEndDate: policy.endDate,
    });

    const claim = await this.claimModel.create({
      memberId: memberIdObj,
      policyId: id,
      claimTitle: input.claimTitle,
      claimDesc: input.claimDesc,
      claimStatus: ClaimStatus.PENDING,
      claimAmount: input.claimAmount,
      claimDocuments: input.claimDocuments ?? [],
      aiAnalysis,
    });
    return claim;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Claim } from '../../libs/dto/claim/claim';
import { Model } from 'mongoose';
import { AiModule } from '../ai/ai.module';
import { PolicyModule } from '../policy/policy.module';
import { SubmitClaimInput } from '../../libs/dto/claim/claim.input';
import { PolicyService } from '../policy/policy.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ClaimStatus } from '../../libs/enums/claim.enum';
import { OpenRouterService } from '../ai/openrouter.service';
@Injectable()
export class ClaimService {
  constructor(
    @InjectModel('Claim') private readonly claimModel: Model<Claim>,
    private readonly OpenRouterService: OpenRouterService,
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
      throw new Error('Policy not found');
    }

    const aiAnalysis = await this.OpenRouterService.analyzeClaim({
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

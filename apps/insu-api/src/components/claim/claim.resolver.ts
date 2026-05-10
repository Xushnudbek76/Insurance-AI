import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClaimService } from './claim.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Claim, Claims } from '../../libs/dto/claim/claim';
import {
  AgentClaimsInquiry,
  AllClaimsInquiry,
  SubmitClaimInput,
  UpdateClaimStatusInput,
} from '../../libs/dto/claim/claim.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class ClaimResolver {
  constructor(private readonly claimService: ClaimService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => Claim)
  public async submitClaim(
    @AuthMember('_id') memberId: string,
    @Args('input') input: SubmitClaimInput,
  ): Promise<Claim> {
    return this.claimService.submitClaim(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Query(() => [Claim])
  public async getMyClaims(
    @AuthMember('_id') memberId: string,
  ): Promise<Claim[]> {
    return this.claimService.getMyClaims(memberId);
  }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Query(() => Claims)
  public async getClaimsByAgent(
    @AuthMember('_id') agentId: string,
    @Args('input') input: AgentClaimsInquiry,
  ): Promise<Claims> {
    return this.claimService.getClaimsByAgentId(agentId, input);
  }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Mutation(() => Claim)
  public async updateClaimStatus(
    @Args('input') input: UpdateClaimStatusInput,
  ): Promise<Claim> {
    return this.claimService.updateClaimStatus(input.claimId, input.newStatus);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Claims)
  public async getAllClaimsByAdmin(
    @Args('input') input: AllClaimsInquiry,
  ): Promise<Claims> {
    return this.claimService.getAllClaimsByAdmin(input);
  }
}

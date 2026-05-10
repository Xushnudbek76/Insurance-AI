import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClaimService } from './claim.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Claim } from '../../libs/dto/claim/claim';
import { SubmitClaimInput } from '../../libs/dto/claim/claim.input';
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
  @Query(() => [Claim])
  public async getClaimsByAgent(
    @AuthMember('_id') agentId: string,
  ): Promise<Claim[]> {
    return this.claimService.getClaimsByAgentId(agentId);
  }
}

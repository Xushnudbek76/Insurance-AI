import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { MemberType } from '../../libs/enums/member.enum';
import {
  AllPoliciesInquiry,
  MyPoliciesInquiry,
  PurchasePolicyInput,
} from '../../libs/dto/policy/policy.input';
import { Policy, Policies } from '../../libs/dto/policy/policy';
import { PolicyService } from './policy.service';

@Resolver()
export class PolicyResolver {
  constructor(private readonly policyService: PolicyService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => Policy)
  public async purchasePolicy(
    @Args('input') input: PurchasePolicyInput,
    @AuthMember('_id') memberId: ObjectId,
    @AuthMember('memberNick') memberNick: string,
  ): Promise<Policy> {
    console.log('Mutation: purchasePolicy');
    return await this.policyService.purchasePolicy(
      memberId,
      memberNick,
      shapeIntoMongoObjectId(input.packageId),
    );
  }

  @UseGuards(AuthGuard)
  @Query(() => Policies)
  public async getMyPolicies(
    @Args('input') input: MyPoliciesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Policies> {
    console.log('Query: getMyPolicies');
    return await this.policyService.getMyPolicies(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Query(() => Policy)
  public async getPolicyById(
    @Args('policyId') input: string,
    @AuthMember('_id') memberId: ObjectId,
    @AuthMember('memberType') memberType: MemberType,
  ): Promise<Policy> {
    console.log('Query: getPolicyById');
    return await this.policyService.getPolicyById(
      shapeIntoMongoObjectId(input),
      memberId,
      memberType,
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Policy)
  public async cancelPolicy(
    @Args('policyId') input: string,
    @AuthMember('_id') memberId: ObjectId,
    @AuthMember('memberType') memberType: MemberType,
  ): Promise<Policy> {
    console.log('Mutation: cancelPolicy');
    return await this.policyService.cancelPolicy(
      shapeIntoMongoObjectId(input),
      memberId,
      memberType,
    );
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Policies)
  public async adminGetAllPolicies(
    @Args('input') input: AllPoliciesInquiry,
  ): Promise<Policies> {
    console.log('Query: adminGetAllPolicies');
    return await this.policyService.adminGetAllPolicies(input);
  }
}

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import {
  AgentsInquiry,
  LoginInput,
  MemberInput,
  MembersInquiry,
} from '../../libs/dto/member.input';
import { Member, Members } from '../../libs/dto/member';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { MemberUpdate } from '../../libs/dto/member.update';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) {}

  @Mutation(() => Member)
  public async signup(@Args('input') input: MemberInput): Promise<Member> {
    console.log('Mutation: signup');
    console.log('input:', input);
    return this.memberService.signup(input);
  }

  @Mutation(() => Member)
  public async login(@Args('input') input: LoginInput): Promise<Member> {
    console.log('Mutation: login');
    return this.memberService.login(input);
  }
  @UseGuards(AuthGuard)
  @Mutation(() => String)
  public async updateMember(
    @Args('input') input: MemberUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Member> {
    console.log('Mutation: updateMember');
    return await this.memberService.updateMember(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => String)
  public checkAuth(@AuthMember('memberNick') memberNick: string): string {
    console.log('Mutation: updateMember');
    return `hi ${memberNick}`;
  }
  @Roles(MemberType.USER)
  @UseGuards(RolesGuard)
  @Mutation(() => String)
  public checkAuthRoles(@AuthMember('memberNick') memberNick: string): string {
    console.log('Mutation: updateMember');
    return `hi ${memberNick}`;
  }

  @UseGuards(WithoutGuard)
  @Query(() => Member)
  public async getMember(
    @AuthMember('_id') memberId: ObjectId,
    @Args('memberId') input: string,
  ): Promise<Member> {
    console.log('Query: getMember');
    const targetId = shapeIntoMongoObjectId(input);
    return await this.memberService.getMember(memberId, targetId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Members)
  public async getAgents(
    @Args('input') input: AgentsInquiry,
    @AuthMember('id') memberId: ObjectId,
  ): Promise<Members> {
    console.log('Query: getAgents');
    return await this.memberService.getAgents(memberId, input);
  }

  // ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Members)
  public async getAllMembersByAdmin(
    @Args('input') input: MembersInquiry,
  ): Promise<Members> {
    console.log('Query: getAllMembersByAdmin');
    return await this.memberService.getAllMembersByAdmin(input);
  }
  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Member)
  public async updateMemberByAdmin(
    @Args('input') input: MemberUpdate,
  ): Promise<Member> {
    console.log('Mutation: updateMembersByAdmin');
    return await this.memberService.updateMemberByAdmin(input);
  }
}

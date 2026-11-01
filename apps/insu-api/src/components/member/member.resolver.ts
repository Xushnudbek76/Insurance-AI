import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { setSession } from '../auth/session-security';
import {
  AgentsInquiry,
  LoginInput,
  MemberInput,
  MembersInquiry,
} from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  MemberUpdate,
  ChangePasswordInput,
} from '../../libs/dto/member/member.update';
import { saveImage, saveImages } from '../../libs/image-upload';
import { GraphQLUpload, FileUpload } from 'graphql-upload';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) {}

  @Mutation(() => Member)
  public async signup(
    @Args('input') input: MemberInput,
    @Context() context: any,
  ): Promise<Member> {
    console.log('Mutation: signup');
    const member = await this.memberService.signup(input);
    return this.browserSession(member, context);
  }

  @Mutation(() => Member)
  public async login(
    @Args('input') input: LoginInput,
    @Context() context: any,
  ): Promise<Member> {
    console.log('Mutation: login');

    const member = await this.memberService.login(input);
    return this.browserSession(member, context);
  }
  @UseGuards(AuthGuard)
  @Mutation(() => Member)
  public async updateMember(
    @Args('input') input: MemberUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Member> {
    console.log('Mutation: updateMember');
    return await this.memberService.updateMember(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Member)
  public async changePassword(
    @Args('input') input: ChangePasswordInput,
    @Context() context: any,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Member> {
    const member = await this.memberService.changePassword(memberId, input);
    return this.browserSession(member, context);
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
    @AuthMember('_id') memberId: ObjectId,
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

  private browserSession(member: Member, context: any): Member {
    if (!member.accessToken) throw new Error('Session could not be created');
    setSession(context.req, context.res, member.accessToken, member);
    member.accessToken = undefined;
    context.res.setHeader('Cache-Control', 'no-store');
    return member;
  }

  // IMAGE UPLOADER (member.resolver.ts)

  @UseGuards(AuthGuard)
  @Mutation((returns) => String)
  public async imageUploader(
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload,
    @Args('target') target: string,
  ): Promise<string> {
    return saveImage(
      { createReadStream, filename, mimetype } as FileUpload,
      target,
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Member)
  public async likeTargetMember(
    @Args('memberId') targetMemberId: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Member> {
    console.log('Mutation: likeTargetMember');
    return this.memberService.likeTargetMember(
      memberId,
      shapeIntoMongoObjectId(targetMemberId),
    );
  }

  @UseGuards(AuthGuard)
  @Mutation((returns) => [String])
  public async imagesUploader(
    @Args('files', { type: () => [GraphQLUpload] })
    files: Promise<FileUpload>[],
    @Args('target') target: string,
  ): Promise<string[]> {
    return saveImages(files, target);
  }
}

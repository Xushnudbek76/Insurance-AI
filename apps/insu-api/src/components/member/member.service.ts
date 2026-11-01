import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import {
  AgentsInquiry,
  LoginInput,
  MemberInput,
  MembersInquiry,
} from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { ViewService } from '../view/view.service';
import { AuthService } from '../auth/auth.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import {
  MemberUpdate,
  ChangePasswordInput,
} from '../../libs/dto/member/member.update';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { lookupAuthMemberLiked } from '../../libs/config';

@Injectable()
export class MemberService {
  constructor(
    @InjectModel('Member') private readonly memberModel: Model<Member>,
    @InjectModel('Follow')
    private readonly followModel: Model<Follower | Following>,
    private authService: AuthService,
    private viewService: ViewService,
    private readonly likeService: LikeService,
  ) {}

  public async signup(input: MemberInput): Promise<Member> {
    if (input.memberType === MemberType.ADMIN) {
      throw new BadRequestException(
        'Administrator accounts cannot be registered publicly',
      );
    }
    input.memberPassword = await this.authService.hashPassword(
      input.memberPassword,
    );
    try {
      const result = await this.memberModel.create(input);
      result.accessToken = await this.authService.createToken(result);
      return result;
    } catch (error: any) {
      console.log('Error, Service.model:', error.message);
      throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
    }
  }
  public async login(input: LoginInput): Promise<Member> {
    const { memberNick, memberPassword } = input;

    const response: Member = (await this.memberModel
      .findOne({ memberNick: memberNick })
      .select('+memberPassword')
      .exec()) as Member;

    if (!response || response.memberStatus === MemberStatus.DELETE) {
      throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
    } else if (response.memberStatus === MemberStatus.BLOCK) {
      throw new InternalServerErrorException(Message.BLOCKED_USER);
    }

    const isMatch = await this.authService.comparePasswords(
      input.memberPassword,
      response.memberPassword,
    );
    if (!isMatch) {
      throw new InternalServerErrorException(Message.WRONG_PASSWORD);
    }

    response.accessToken = await this.authService.createToken(response);

    return response;
  }
  public async updateMember(
    memberId: ObjectId,
    input: MemberUpdate,
  ): Promise<Member> {
    if (input.memberType !== undefined || input.memberStatus !== undefined) {
      throw new BadRequestException(
        'Account roles and status require an administrator',
      );
    }
    if (input.memberPassword !== undefined) {
      throw new BadRequestException(
        'Use changePassword to update your password',
      );
    }
    const { _id, memberPassword, ...update } = input;
    const result: Member | null = await this.memberModel
      .findOneAndUpdate(
        {
          _id: memberId,
          memberStatus: MemberStatus.ACTIVE,
        },
        { $set: update },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    return result;
  }
  public async changePassword(
    memberId: ObjectId,
    input: ChangePasswordInput,
  ): Promise<Member> {
    if (Buffer.byteLength(input.newPassword, 'utf8') > 72) {
      throw new BadRequestException('Password must be at most 72 UTF-8 bytes');
    }
    const member = await this.memberModel
      .findOne({ _id: memberId, memberStatus: MemberStatus.ACTIVE })
      .select('+memberPassword')
      .exec();
    if (
      !member ||
      !(await this.authService.comparePasswords(
        input.currentPassword,
        member.memberPassword,
      ))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const memberPassword = await this.authService.hashPassword(
      input.newPassword,
    );
    const result = await this.memberModel
      .findOneAndUpdate(
        {
          _id: memberId,
          memberStatus: MemberStatus.ACTIVE,
          memberPassword: member.memberPassword,
        },
        { $set: { memberPassword }, $inc: { authVersion: 1 } },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!result)
      throw new UnauthorizedException('Account changed; sign in again');
    await this.authService.invalidateMemberSessions(memberId);
    result.accessToken = await this.authService.createToken(result);
    return result;
  }

  public async getMember(
    memberId: ObjectId | null,
    targetId: ObjectId,
  ): Promise<Member> {
    const search: T = {
      _id: targetId,
      memberStatus: {
        $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
      },
    };
    const targetMember = await this.memberModel.findOne(search).lean().exec();
    if (!targetMember)
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    console.log(memberId);
    if (memberId) {
      const viewInput = {
        memberId: memberId,
        viewRefId: targetId,
        viewGroup: ViewGroup.MEMBER,
      };
      const newView = await this.viewService.recordView(viewInput);

      if (newView) {
        await this.memberModel
          .findByIdAndUpdate(
            targetId,
            { $inc: { memberViews: 1 } },
            { new: true },
          )
          .exec();
        targetMember.memberViews!++;
      }
      const likeInput = {
        memberId,
        likeRefId: targetId,
        likeGroup: LikeGroup.MEMBER,
      };
      targetMember.meLiked = (await this.likeService.checkLikeExistence(
        likeInput,
      )) as any;
      targetMember.meFollowed = await this.checkSubscription(
        memberId,
        targetId,
      );
    }
    return targetMember;
  }

  public async getAgents(
    memberId: ObjectId,
    input: AgentsInquiry,
  ): Promise<Members> {
    const { text } = input.search;
    const match: T = {
      memberType: MemberType.AGENT,
      memberStatus: MemberStatus.ACTIVE,
    };
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };

    if (text?.trim()) {
      const escaped = text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const search = { $regex: new RegExp(escaped, 'i') };
      match.$or = [{ memberNick: search }, { memberFullName: search }];
    }

    const result = await this.memberModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            lookupAuthMemberLiked(memberId),
          ],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]);
    if (!result.length)
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
    const { memberStatus, memberType, text } = input.search;
    const match: T = {};
    const sort: T = {
      [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC,
    };
    if (memberStatus) match.memberStatus = memberStatus;
    if (memberType) match.memberType = memberType;
    if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

    const result = await this.memberModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            lookupAuthMemberLiked(null),
          ],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]);
    if (!result.length)
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }
  public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
    if (input.memberPassword !== undefined) {
      throw new BadRequestException(
        'Passwords cannot be changed through profile updates',
      );
    }
    const { _id, memberPassword, ...update } = input;
    const result = await this.memberModel
      .findByIdAndUpdate(
        _id,
        { $set: update },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (input.memberStatus !== undefined || input.memberType !== undefined) {
      await this.authService.invalidateMemberSessions(result._id);
    }
    return result as Member;
  }
  public async memberStatsEditor(
    input: StatisticModifier,
  ): Promise<Member | null> {
    console.log('executed');
    const { _id, targetKey, modifier } = input;
    return await this.memberModel
      .findOneAndUpdate(
        { _id },
        { $inc: { [targetKey]: modifier } },
        { new: true },
      )
      .exec();
  }

  public async likeTargetMember(
    memberId: ObjectId,
    likeRefId: ObjectId,
  ): Promise<Member> {
    const target = await this.memberModel
      .findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE })
      .exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      memberId,
      likeRefId,
      likeGroup: LikeGroup.MEMBER,
    };
    const modifier = await this.likeService.toggleLike(input);
    const result = await this.memberStatsEditor({
      _id: likeRefId,
      targetKey: 'memberLikes',
      modifier,
    });
    if (!result)
      throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
    return result;
  }

  private async checkSubscription(
    followerId: ObjectId,
    followingId: ObjectId,
  ): Promise<MeFollowed[]> {
    const result = await this.followModel
      .findOne({ followingId: followingId, followerId: followerId })
      .exec();
    return result
      ? [
          {
            followerId: followerId,
            followingId: followingId,
            myFollowing: true,
          },
        ]
      : [];
  }
}

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MemberStatus } from '../../libs/enums/member.enum';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Subject } from 'rxjs';
import { AuthSession } from '../../schemas/AuthSession.model';
import { sessionHash, SESSION_SECONDS } from './session-security';
import { JwtService } from '@nestjs/jwt';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Member } from '../../libs/dto/member/member';

@Injectable()
export class AuthService {
  readonly revokedSessions = new Subject<string>();
  readonly revokedMembers = new Subject<string>();
  constructor(
    private jwtService: JwtService,
    @InjectModel('Member') private readonly memberModel: Model<Member>,
    @InjectModel('AuthSession')
    private readonly sessionModel: Model<AuthSession>,
  ) {}

  public async hashPassword(memberPassword: string): Promise<string> {
    if (Buffer.byteLength(memberPassword, 'utf8') > 72)
      throw new BadRequestException('Password must be at most 72 UTF-8 bytes');
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(memberPassword, salt);
  }

  public async comparePasswords(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  public async createToken(member: Member): Promise<string> {
    const jti = randomUUID();
    const token = await this.jwtService.signAsync({
      _id: String(member._id),
      authVersion: member.authVersion ?? 0,
      jti,
      tokenUse: 'session',
    });
    await this.sessionModel.create({
      sessionHash: sessionHash(jti),
      memberId: new Types.ObjectId(String(member._id)),
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
    });
    return token;
  }

  public async invalidateMemberSessions(memberId: unknown): Promise<void> {
    await this.sessionModel
      .deleteMany({ memberId: new Types.ObjectId(String(memberId)) })
      .exec();
    this.revokedMembers.next(String(memberId));
  }

  public async revokeToken(token: string): Promise<void> {
    let claims: any;
    try {
      claims = await this.jwtService.verifyAsync(token);
    } catch {
      return;
    }
    if (typeof claims.jti !== 'string' || claims.tokenUse !== 'session') return;
    await this.sessionModel
      .deleteOne({ sessionHash: sessionHash(claims.jti) })
      .exec();
    this.revokedSessions.next(claims.jti);
  }

  public async verifyToken(token: string): Promise<Member> {
    const claims = await this.jwtService.verifyAsync(token);
    if (claims.tokenUse !== 'session' || typeof claims.jti !== 'string')
      throw new UnauthorizedException('Sign in again');
    const session = await this.sessionModel
      .findOne({
        sessionHash: sessionHash(claims.jti),
        expiresAt: { $gt: new Date() },
      })
      .lean()
      .exec();
    if (!session || String(session.memberId) !== String(claims._id))
      throw new UnauthorizedException('Session has ended');
    const member = await this.memberModel
      .findOne({
        _id: shapeIntoMongoObjectId(claims._id),
        memberStatus: MemberStatus.ACTIVE,
      })
      .lean()
      .exec();
    if (
      !member ||
      member.memberStatus !== MemberStatus.ACTIVE ||
      (member.authVersion ?? 0) !== (claims.authVersion ?? 0)
    ) {
      throw new UnauthorizedException('Session is no longer active');
    }
    // Current account status and roles take precedence over old token claims.
    return {
      ...member,
      exp: claims.exp,
      iat: claims.iat,
      sessionId: claims.jti,
    } as Member;
  }
}

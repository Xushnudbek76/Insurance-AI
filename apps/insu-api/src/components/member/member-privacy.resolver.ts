import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Member } from '../../libs/dto/member/member';
import { MemberType } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';
import { requestToken, verifiedMember } from '../auth/session-security';
const viewers = Symbol('verifiedCookieViewer');
@Resolver(() => Member)
export class MemberPrivacyResolver {
  constructor(private readonly auth: AuthService) {}
  @ResolveField(() => String, { nullable: true })
  memberPhone(@Parent() member: Member, @Context() context: any) {
    return this.privateField(member, context, 'memberPhone');
  }
  @ResolveField(() => String, { nullable: true })
  memberAddress(@Parent() member: Member, @Context() context: any) {
    return this.privateField(member, context, 'memberAddress');
  }
  private async privateField(
    member: Member,
    context: any,
    field: 'memberPhone' | 'memberAddress',
  ) {
    let viewer = context.req?.[verifiedMember];
    if (!viewer) {
      const token = requestToken(context.req ?? {});
      if (!token) return null;
      context[viewers] ??= this.auth.verifyToken(token).catch(() => null);
      viewer = await context[viewers];
    }
    if (
      !viewer ||
      (viewer.memberType !== MemberType.ADMIN &&
        String(viewer._id) !== String(member._id))
    )
      return null;
    return member[field] ?? null;
  }
}

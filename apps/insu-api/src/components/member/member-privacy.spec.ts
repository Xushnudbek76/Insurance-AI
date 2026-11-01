import { verifiedMember } from '../auth/session-security';
import { MemberPrivacyResolver } from './member-privacy.resolver';
import { MemberType } from '../../libs/enums/member.enum';

describe('Private member GraphQL fields', () => {
  const member = {
    _id: 'owner',
    memberPhone: 'private-phone',
    memberAddress: 'private-address',
  } as any;
  const resolver = new MemberPrivacyResolver({
    verifyToken: async (token: string) => {
      if (token === 'self')
        return { _id: 'owner', memberType: MemberType.USER };
      if (token === 'other')
        return { _id: 'other', memberType: MemberType.USER };
      if (token === 'admin')
        return { _id: 'admin', memberType: MemberType.ADMIN };
      throw new Error('invalid');
    },
  } as any);
  it('does not trust a viewer forged in an anonymous request body', async () => {
    const context = {
      req: {
        headers: {},
        body: { authMember: { _id: 'owner', memberType: MemberType.ADMIN } },
      },
    };
    expect(await resolver.memberPhone(member, context)).toBeNull();
    expect(await resolver.memberAddress(member, context)).toBeNull();
  });
  it.each(['other', 'invalid'])(
    'does not reveal contact fields to %s',
    async (token) => {
      const context = {
        req: { headers: { cookie: `insu-session=${token}` } },
      };
      expect(await resolver.memberPhone(member, context)).toBeNull();
      expect(await resolver.memberAddress(member, context)).toBeNull();
    },
  );
  it.each(['self', 'admin'])(
    'preserves authorized %s access',
    async (token) => {
      const context = {
        req: { headers: { cookie: `insu-session=${token}` } },
      };
      expect(await resolver.memberPhone(member, context)).toBe('private-phone');
      expect(await resolver.memberAddress(member, context)).toBe(
        'private-address',
      );
    },
  );
  it('preserves the newly signed-in member response', async () => {
    expect(
      await resolver.memberPhone(member, {
        req: {
          headers: {},
          [verifiedMember]: { _id: 'owner', memberType: MemberType.USER },
        },
      }),
    ).toBe('private-phone');
  });
});

import { AuthService } from './auth.service';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Types } from 'mongoose';

describe('Live session authorization', () => {
  const id = new Types.ObjectId();
  const claims = {
    _id: String(id),
    jti: 'test-session',
    tokenUse: 'session',
    memberType: MemberType.ADMIN,
    memberStatus: MemberStatus.ACTIVE,
    authVersion: 0,
    exp: 9999999999,
  };
  const jwt = { verifyAsync: async () => ({ ...claims }) };
  const makeAuth = (member: any) =>
    new (AuthService as any)(
      jwt,
      {
        findOne: () => ({ lean: () => ({ exec: async () => member }) }),
      },
      {
        findOne: () => ({
          lean: () => ({ exec: async () => ({ memberId: id }) }),
        }),
      },
    );
  it('rejects a token when its account has been blocked', async () => {
    await expect(makeAuth(null).verifyToken('token')).rejects.toThrow();
  });
  it('uses the current database role after an administrator is demoted', async () => {
    const member = {
      _id: id,
      memberType: MemberType.USER,
      memberStatus: MemberStatus.ACTIVE,
      authVersion: 0,
    };
    const result = await makeAuth(member).verifyToken('token');
    expect(result.memberType).toBe(MemberType.USER);
  });
  it('rejects the old token after a password change increments the session version', async () => {
    await expect(
      makeAuth({
        _id: id,
        memberStatus: MemberStatus.ACTIVE,
        authVersion: 1,
      }).verifyToken('token'),
    ).rejects.toThrow();
  });
});

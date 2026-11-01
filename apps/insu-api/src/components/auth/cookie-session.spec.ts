import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';

describe('Server-backed cookie sessions', () => {
  const id = new Types.ObjectId();
  let jwt: JwtService;
  let auth: AuthService;
  let records: Map<string, any>;
  const member: any = {
    _id: id,
    memberType: MemberType.USER,
    memberStatus: MemberStatus.ACTIVE,
    authVersion: 0,
    memberPhone: 'private-phone',
    memberAddress: 'private-address',
    memberPassword: 'private-password',
  };
  beforeEach(() => {
    records = new Map();
    jwt = new JwtService({
      secret: 'unit-test-signing-key-at-least-32-characters',
      signOptions: {
        expiresIn: '12h',
        issuer: 'insu-api',
        audience: 'insu-web',
      },
    });
    const members = {
      findOne: () => ({ lean: () => ({ exec: async () => ({ ...member }) }) }),
    };
    const sessions = {
      create: async (record: any) => {
        records.set(record.sessionHash, record);
        return record;
      },
      findOne: (filter: any) => ({
        lean: () => ({
          exec: async () => {
            const record = records.get(filter.sessionHash);
            return record && record.expiresAt > new Date() ? record : null;
          },
        }),
      }),
      deleteOne: (filter: any) => ({
        exec: async () => ({
          deletedCount: records.delete(filter.sessionHash) ? 1 : 0,
        }),
      }),
    };
    auth = Reflect.construct(AuthService, [jwt, members, sessions]);
  });
  it('keeps private profile fields out of signed claims', async () => {
    const token = await auth.createToken(member);
    const claims: any = jwt.decode(token);
    expect(claims.memberPhone).toBeUndefined();
    expect(claims.memberAddress).toBeUndefined();
    expect(claims.memberPassword).toBeUndefined();
    expect(claims.jti).toEqual(expect.any(String));
  });
  it('rejects legacy tokens with no server session', async () => {
    const token = await jwt.signAsync({ _id: String(id), authVersion: 0 });
    await expect(auth.verifyToken(token)).rejects.toThrow();
  });
  it('makes a signed token unusable after logout revokes its server record', async () => {
    const token = await auth.createToken(member);
    expect((await auth.verifyToken(token))._id.toString()).toBe(String(id));
    await (auth as any).revokeToken(token);
    await expect(auth.verifyToken(token)).rejects.toThrow();
  });
  it('does not silently report logout success when revocation storage fails', async () => {
    const token = await auth.createToken(member);
    const failed = Reflect.construct(AuthService, [
      jwt,
      {},
      {
        deleteOne: () => ({
          exec: async () => {
            throw new Error('unavailable');
          },
        }),
      },
    ]);
    await expect(failed.revokeToken(token)).rejects.toThrow('unavailable');
  });
  it('does not store the bearer token in the session database', async () => {
    const token = await auth.createToken(member);
    expect(records.size).toBe(1);
    expect(JSON.stringify([...records.values()])).not.toContain(token);
  });
});

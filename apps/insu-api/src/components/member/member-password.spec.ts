import { MemberService } from './member.service';
import { AuthService } from '../auth/auth.service';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

describe('Verified password changes', () => {
  const id = new Types.ObjectId();
  let record: any;
  let service: MemberService;
  let auth: AuthService;
  let signed: any;
  beforeEach(async () => {
    record = {
      _id: id,
      memberNick: 'client',
      memberType: MemberType.USER,
      memberStatus: MemberStatus.ACTIVE,
      memberPassword: await bcrypt.hash('old-password', 4),
      authVersion: 0,
    };
    const model: any = {
      findOne: () => ({
        select: () => ({ exec: async () => ({ ...record }) }),
        lean: () => ({ exec: async () => ({ ...record }) }),
      }),
      findOneAndUpdate: (_filter: any, update: any) => ({
        exec: async () => {
          record = {
            ...record,
            ...update.$set,
            authVersion: record.authVersion + update.$inc.authVersion,
          };
          return { ...record };
        },
      }),
    };
    auth = new AuthService(
      {
        signAsync: async (payload: any) => {
          signed = payload;
          return 'new-token';
        },
        verifyAsync: async () => ({ _id: String(id), authVersion: 0 }),
      } as any,
      model,
      {
        create: async () => ({}),
        deleteMany: () => ({ exec: async () => ({ deletedCount: 1 }) }),
      } as any,
    );
    service = new MemberService(model, {} as any, auth, {} as any, {} as any);
  });
  it('rejects an incorrect current password without changing credentials', async () => {
    await expect(
      service.changePassword(id as any, {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toThrow();
    expect(await bcrypt.compare('old-password', record.memberPassword)).toBe(
      true,
    );
  });
  it('hashes the replacement, returns a current session and revokes the previous token', async () => {
    const result = await service.changePassword(id as any, {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
    expect(await bcrypt.compare('new-password', record.memberPassword)).toBe(
      true,
    );
    expect(record.memberPassword).not.toBe('new-password');
    expect(record.authVersion).toBe(1);
    expect(result.accessToken).toBe('new-token');
    expect(signed.memberPassword).toBeUndefined();
    await expect(auth.verifyToken('old-token')).rejects.toThrow();
  });
  it('rejects passwords that exceed bcrypt’s UTF-8 byte limit', async () => {
    await expect(
      service.changePassword(id as any, {
        currentPassword: 'old-password',
        newPassword: '한'.repeat(25),
      }),
    ).rejects.toThrow(/72/);
  });
});

import { BadRequestException } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';

describe('Public member role boundaries', () => {
  const model = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const auth = { hashPassword: jest.fn(), createToken: jest.fn() };
  let service: MemberService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MemberService(
      model as any,
      {} as any,
      auth as any,
      {} as any,
      {} as any,
    );
  });

  it('rejects administrator registration before hashing or writing', async () => {
    await expect(
      service.signup({
        memberNick: 'new-admin',
        memberPhone: '5550100',
        memberPassword: 'test-password',
        memberType: MemberType.ADMIN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(model.create).not.toHaveBeenCalled();
    expect(auth.hashPassword).not.toHaveBeenCalled();
  });

  it.each([MemberType.USER, MemberType.AGENT])(
    'preserves public %s registration',
    async (memberType) => {
      auth.hashPassword.mockResolvedValue('hashed-password');
      auth.createToken.mockResolvedValue('test-token');
      model.create.mockResolvedValue({ memberType });
      const result = await service.signup({
        memberNick: 'new-member',
        memberPhone: '5550101',
        memberPassword: 'test-password',
        memberType,
      });
      expect(result.accessToken).toBe('test-token');
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberType,
          memberPassword: 'hashed-password',
        }),
      );
    },
  );

  it.each([
    { memberType: MemberType.ADMIN },
    { memberType: MemberType.AGENT },
    { memberStatus: MemberStatus.ACTIVE },
  ])(
    'rejects role/status changes through self-service updates: %o',
    async (restricted) => {
      await expect(
        service.updateMember('member-id' as any, {
          _id: 'member-id',
          memberNick: undefined,
          ...restricted,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('preserves ordinary profile edits', async () => {
    model.findOneAndUpdate.mockReturnValue({
      exec: async () => ({ memberNick: 'client' }),
    });
    auth.createToken.mockResolvedValue('updated-token');
    const result = await service.updateMember('member-id' as any, {
      _id: 'member-id',
      memberNick: 'client',
      memberFullName: 'Alex Chen',
    });
    expect(result.memberNick).toBe('client');
    expect(result.accessToken).toBeUndefined();
  });
});

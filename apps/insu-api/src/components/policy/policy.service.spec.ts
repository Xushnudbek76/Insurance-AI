import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyStatus } from '../../libs/enums/policy.enum';
import { PackageStatus } from '../../libs/enums/package.enum';
import { MemberType } from '../../libs/enums/member.enum';

describe('PolicyService', () => {
  let policyModel: any;
  let packageModel: any;
  let service: PolicyService;

  beforeEach(() => {
    policyModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      aggregate: jest.fn(),
    };
    packageModel = {
      findOne: jest.fn(),
    };
    service = new PolicyService(policyModel, packageModel, {
      requireActiveMember: jest
        .fn()
        .mockResolvedValue({ memberStatus: 'ACTIVE' }),
    } as any);
  });

  it('legacy_purchase_cannot_activate', async () => {
    await expect(
      service.purchasePolicy('member1' as any, 'nick', 'pkg1' as any),
    ).rejects.toThrow('Please chat with the agent');
    expect(policyModel.create).not.toHaveBeenCalled();
  });
  it('admin_cannot_read_unconfirmed_offer_but_can_read_issued_policy', async () => {
    const policy = {
      memberId: 'owner',
      conversationId: 'conversation',
      AgentId: 'agent',
      paymentConfirmedAt: null,
    };
    policyModel.findById.mockReturnValue({ exec: async () => policy });
    await expect(
      service.getPolicyById('p' as any, 'admin' as any, MemberType.ADMIN),
    ).rejects.toThrow(ForbiddenException);
    policy.paymentConfirmedAt = new Date() as any;
    await expect(
      service.getPolicyById('p' as any, 'admin' as any, MemberType.ADMIN),
    ).resolves.toEqual(policy);
  });
  it('rejects non-owner policy access', async () => {
    policyModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ memberId: 'owner1' }),
    });

    await expect(
      service.getPolicyById('pol1' as any, 'member2' as any, MemberType.USER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('cancels active policy', async () => {
    policyModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'pol1',
        memberId: 'member1',
        policyStatus: PolicyStatus.ACTIVE,
      }),
    });
    policyModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'pol1',
        policyStatus: PolicyStatus.CANCELLED,
      }),
    });

    const result = await service.cancelPolicy(
      'pol1' as any,
      'member1' as any,
      MemberType.USER,
    );

    expect(result.policyStatus).toBe(PolicyStatus.CANCELLED);
  });
});

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyStatus } from '../../libs/enums/policy.enum';
import { PackageStatus } from '../../libs/enums/package.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { beforeEach, describe, it } from 'node:test';

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
    service = new PolicyService(policyModel, packageModel);
  });

  it('creates policy snapshot from package data', async () => {
    packageModel.findOne.mockReturnValue({
      lean: () => ({
        exec: jest.fn().mockResolvedValue({
          _id: 'pkg1',
          packageStatus: PackageStatus.ACTIVE,
          packageName: 'Starter Auto Shield',
          packagePrice: 120,
        }),
      }),
    });
    policyModel.findOne.mockReturnValue({
      lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
    });
    policyModel.create.mockImplementation(async (input: any) => input);

    const result = await service.purchasePolicy(
      'member1' as any,
      'nick',
      'pkg1' as any,
    );

    expect(result.memberNick).toBe('nick');
    expect(result.packageName).toBe('Starter Auto Shield');
    expect(result.premiumAmount).toBe(120);
    expect(result.policyStatus).toBe(PolicyStatus.ACTIVE);
  });

  it('blocks duplicate active policy purchase', async () => {
    packageModel.findOne.mockReturnValue({
      lean: () => ({
        exec: jest.fn().mockResolvedValue({
          _id: 'pkg1',
          packageStatus: PackageStatus.ACTIVE,
          packageName: 'Starter Auto Shield',
          packagePrice: 120,
        }),
      }),
    });
    policyModel.findOne.mockReturnValue({
      lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: 'pol1' }) }),
    });

    await expect(
      service.purchasePolicy('member1' as any, 'nick', 'pkg1' as any),
    ).rejects.toThrow(BadRequestException);
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

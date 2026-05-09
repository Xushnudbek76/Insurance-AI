jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

import { Package } from '../../libs/dto/package/package';
import { InsuranceType } from '../../libs/enums/package.enum';
import { PackageStatus } from '../../libs/enums/package.enum';
import { RecommendationService } from './recommendation.service';

describe('RecommendationService', () => {
  const candidates = [
    {
      _id: '1',
      packageStatus: PackageStatus.ACTIVE,
      packageName: 'Starter Auto',
      packageType: InsuranceType.AUTO,
      packagePrice: 90,
      packageRank: 10,
      packageViews: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: '2',
      packageStatus: PackageStatus.ACTIVE,
      packageName: 'Better Auto',
      packageType: InsuranceType.AUTO,
      packagePrice: 120,
      packageRank: 9,
      packageViews: 40,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: '3',
      packageStatus: PackageStatus.ACTIVE,
      packageName: 'Premium Auto',
      packageType: InsuranceType.AUTO,
      packagePrice: 150,
      packageRank: 8,
      packageViews: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as unknown as Package[];

  it('falls back deterministically when ai ranking missing', async () => {
    const service = new RecommendationService(
      {
        getRecommendationCandidates: jest.fn().mockResolvedValue(candidates),
        populateMemberData: jest
          .fn()
          .mockImplementation(async (packages: Package[]) => packages),
      } as any,
      {
        rankPackages: jest.fn().mockResolvedValue(null),
      } as any,
    );

    const result = await service.getInsuranceRecommendation({
      types: [InsuranceType.AUTO],
      budget: 120,
    });

    expect(result.recommendedPackages.map((candidate) => candidate._id)).toEqual(
      ['1', '2', '3'],
    );
    expect(result.reason).toContain('Recommended from matched insurance type');
  });

  it('uses ai-ranked package ids first and fills to top 3', async () => {
    const service = new RecommendationService(
      {
        getRecommendationCandidates: jest.fn().mockResolvedValue(candidates),
        populateMemberData: jest
          .fn()
          .mockImplementation(async (packages: Package[]) => packages),
      } as any,
      {
        rankPackages: jest.fn().mockResolvedValue({
          riskScore: 64,
          reason: 'AI ranked packages',
          topPackageIds: ['2'],
          packageReasons: ['best fit'],
        }),
      } as any,
    );

    const result = await service.getInsuranceRecommendation({
      types: [InsuranceType.AUTO],
    });

    expect(result.recommendedPackages.map((candidate) => candidate._id)).toEqual(
      ['2', '1', '3'],
    );
    expect(result.riskScore).toBe(64);
  });
});

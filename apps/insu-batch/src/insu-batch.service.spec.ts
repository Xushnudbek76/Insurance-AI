import { InsuBatchService } from './insu-batch.service';
import { MemberStatus, MemberType } from '../../insu-api/src/libs/enums/member.enum';
import { PackageStatus } from '../../insu-api/src/libs/enums/package.enum';

describe('InsuBatchService', () => {
  let packageModel: any;
  let memberModel: any;
  let policyModel: any;
  let service: InsuBatchService;

  beforeEach(() => {
    packageModel = {
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    memberModel = {
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    policyModel = {
      updateMany: jest.fn(),
    };

    service = new InsuBatchService(packageModel, memberModel, policyModel);
  });

  it('stores package rank as leaderboard position', async () => {
    packageModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'pkg-a',
          packageStatus: PackageStatus.ACTIVE,
          packageViews: 10,
          packageLikes: 0,
          createdAt: new Date('2024-01-01'),
        },
        {
          _id: 'pkg-b',
          packageStatus: PackageStatus.ACTIVE,
          packageViews: 8,
          packageLikes: 4,
          createdAt: new Date('2024-01-02'),
        },
      ]),
    });

    await service.batchTopPackages();

    expect(packageModel.find).toHaveBeenCalledWith({
      packageStatus: PackageStatus.ACTIVE,
    });
    expect(packageModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      'pkg-b',
      { packageRank: 1 },
    );
    expect(packageModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      'pkg-a',
      { packageRank: 2 },
    );
  });

  it('stores agent rank as leaderboard position', async () => {
    memberModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'agent-a',
          memberStatus: MemberStatus.ACTIVE,
          memberType: MemberType.AGENT,
          memberViews: 30,
          memberLikes: 3,
          memberArticles: 1,
          memberProperties: 1,
          createdAt: new Date('2024-01-01'),
        },
        {
          _id: 'agent-b',
          memberStatus: MemberStatus.ACTIVE,
          memberType: MemberType.AGENT,
          memberViews: 20,
          memberLikes: 8,
          memberArticles: 2,
          memberProperties: 2,
          createdAt: new Date('2024-01-02'),
        },
      ]),
    });

    await service.batchTopAgents();

    expect(memberModel.find).toHaveBeenCalledWith({
      memberStatus: MemberStatus.ACTIVE,
      memberType: MemberType.AGENT,
    });
    expect(memberModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      'agent-b',
      { memberRank: 1 },
    );
    expect(memberModel.findByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      'agent-a',
      { memberRank: 2 },
    );
  });
});

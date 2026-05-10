import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberStatus, MemberType } from '../../insu-api/src/libs/enums/member.enum';
import { PackageStatus } from '../../insu-api/src/libs/enums/package.enum';
import { PolicyStatus } from '../../insu-api/src/libs/enums/policy.enum';

@Injectable()
export class InsuBatchService {
  private readonly logger = new Logger(InsuBatchService.name);

  constructor(
    @InjectModel('Package') private readonly packageModel: Model<any>,
    @InjectModel('Member') private readonly memberModel: Model<any>,
    @InjectModel('Policy') private readonly policyModel: Model<any>,
  ) {}

  public async batchRollback(): Promise<void> {
    this.logger.log('batchRollback: START');
    await this.packageModel.updateMany(
      { packageStatus: PackageStatus.ACTIVE },
      { packageRank: 0 },
    );
    await this.memberModel.updateMany(
      { memberStatus: MemberStatus.ACTIVE, memberType: MemberType.AGENT },
      { memberRank: 0 },
    );
    this.logger.log('batchRollback: DONE');
  }

  public async batchTopPackages(): Promise<void> {
    this.logger.log('batchTopPackages: START');
    const packages = await this.packageModel
      .find({ packageStatus: PackageStatus.ACTIVE, packageRank: 0 })
      .exec();

    for (const pkg of packages) {
      const rank = pkg.packageViews * 1 + pkg.packageLikes * 2;
      await this.packageModel.findByIdAndUpdate(pkg._id, { packageRank: rank });
    }
    this.logger.log(`batchTopPackages: DONE — updated ${packages.length} packages`);
  }

  public async batchTopAgents(): Promise<void> {
    this.logger.log('batchTopAgents: START');
    const agents = await this.memberModel
      .find({ memberStatus: MemberStatus.ACTIVE, memberType: MemberType.AGENT, memberRank: 0 })
      .exec();

    for (const agent of agents) {
      const rank =
        agent.memberViews * 1 +
        agent.memberLikes * 2 +
        agent.memberArticles * 3 +
        agent.memberProperties * 5;
      await this.memberModel.findByIdAndUpdate(agent._id, { memberRank: rank });
    }
    this.logger.log(`batchTopAgents: DONE — updated ${agents.length} agents`);
  }

  public async batchExpiredPolicies(): Promise<void> {
    this.logger.log('batchExpiredPolicies: START');
    const result = await this.policyModel.updateMany(
      { endDate: { $lt: new Date() }, policyStatus: PolicyStatus.ACTIVE },
      { policyStatus: PolicyStatus.EXPIRED },
    );
    this.logger.log(`batchExpiredPolicies: DONE — expired ${result.modifiedCount} policies`);
  }
}

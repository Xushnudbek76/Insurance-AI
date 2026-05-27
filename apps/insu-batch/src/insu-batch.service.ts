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
      .find({ packageStatus: PackageStatus.ACTIVE })
      .exec();

    const rankedPackages = [...packages].sort((left, right) => {
      const scoreDiff =
        this.getPackageScore(right) - this.getPackageScore(left);

      if (scoreDiff !== 0) return scoreDiff;

      const viewsDiff = (right.packageViews ?? 0) - (left.packageViews ?? 0);
      if (viewsDiff !== 0) return viewsDiff;

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    for (const [index, pkg] of rankedPackages.entries()) {
      await this.packageModel.findByIdAndUpdate(pkg._id, {
        packageRank: index + 1,
      });
    }
    this.logger.log(`batchTopPackages: DONE — updated ${packages.length} packages`);
  }

  public async batchTopAgents(): Promise<void> {
    this.logger.log('batchTopAgents: START');
    const agents = await this.memberModel
      .find({ memberStatus: MemberStatus.ACTIVE, memberType: MemberType.AGENT })
      .exec();

    const rankedAgents = [...agents].sort((left, right) => {
      const scoreDiff = this.getAgentScore(right) - this.getAgentScore(left);

      if (scoreDiff !== 0) return scoreDiff;

      const viewsDiff = (right.memberViews ?? 0) - (left.memberViews ?? 0);
      if (viewsDiff !== 0) return viewsDiff;

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    for (const [index, agent] of rankedAgents.entries()) {
      await this.memberModel.findByIdAndUpdate(agent._id, {
        memberRank: index + 1,
      });
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

  private getPackageScore(pkg: any): number {
    return (pkg.packageViews ?? 0) * 1 + (pkg.packageLikes ?? 0) * 2;
  }

  private getAgentScore(agent: any): number {
    return (
      (agent.memberViews ?? 0) * 1 +
      (agent.memberLikes ?? 0) * 2 +
      (agent.memberArticles ?? 0) * 3 +
      (agent.memberProperties ?? 0) * 5
    );
  }
}

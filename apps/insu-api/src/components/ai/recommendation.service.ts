import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InsuranceRecommendationInput } from '../../libs/dto/package/package.input';
import {
  InsuranceRecommendationResult,
  Package,
} from '../../libs/dto/package/package';
import { Message } from '../../libs/enums/common.enum';
import { PackageService } from '../insurance-packages/package.service';
import { OpenRouterService } from './openrouter.service';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly packageService: PackageService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  public async getInsuranceRecommendation(
    input: InsuranceRecommendationInput,
  ): Promise<InsuranceRecommendationResult> {
    const candidates =
      await this.packageService.getRecommendationCandidates(input);

    if (!candidates.length) {
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }

    const ranking =
      candidates.length > 1
        ? await this.openRouterService.rankPackages(input, candidates)
        : null;

    if (!ranking) {
      return this.buildFallbackRecommendation(input, candidates);
    }

    const packageMap = new Map(
      candidates.map((candidate) => [`${candidate._id}`, candidate]),
    );
    const rankedPackages = ranking.topPackageIds
      .map((id) => packageMap.get(id))
      .filter((candidate): candidate is Package => Boolean(candidate));

    const finalPackages = this.supplementTopPackages(
      rankedPackages,
      candidates,
    );
    await this.packageService.populateMemberData(finalPackages);

    return {
      riskScore: ranking.riskScore,
      reason: ranking.reason,
      recommendedPackages: finalPackages,
      rawFactors:
        ranking.packageReasons.length > 0
          ? ranking.packageReasons
          : finalPackages.map((candidate) =>
              this.describePackageReason(candidate),
            ),
    };
  }

  private async buildFallbackRecommendation(
    input: InsuranceRecommendationInput,
    candidates: Package[],
  ): Promise<InsuranceRecommendationResult> {
    const topPackages = candidates.slice(0, 3);
    await this.packageService.populateMemberData(topPackages);

    return {
      riskScore: this.estimateRiskScore(input),
      reason:
        'Recommended from matched insurance type, coverage, price, and package ranking signals.',
      recommendedPackages: topPackages,
      rawFactors: topPackages.map((candidate) =>
        this.describePackageReason(candidate),
      ),
    };
  }

  private supplementTopPackages(
    rankedPackages: Package[],
    candidates: Package[],
  ): Package[] {
    if (rankedPackages.length >= 3) {
      return rankedPackages.slice(0, 3);
    }

    const rankedIds = new Set(
      rankedPackages.map((candidate) => `${candidate._id}`),
    );
    const remainder = candidates.filter(
      (candidate) => !rankedIds.has(`${candidate._id}`),
    );

    return [...rankedPackages, ...remainder].slice(0, 3);
  }

  private estimateRiskScore(input: InsuranceRecommendationInput): number {
    let score = 25 + input.types.length * 10;

    if (input.age !== undefined) {
      score += Math.min(30, Math.floor(input.age / 3));
    }

    if (input.budget !== undefined && input.budget < 100) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private describePackageReason(candidate: Package): string {
    const coverage =
      candidate.packageCoverageLimit !== undefined
        ? `coverage ${candidate.packageCoverageLimit}`
        : 'coverage profile available';

    return `${candidate.packageName}: matched ${candidate.packageType}, ${coverage}, price ${candidate.packagePrice}.`;
  }
}

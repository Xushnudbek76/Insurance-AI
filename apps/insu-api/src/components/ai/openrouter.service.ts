import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { InsuranceRecommendationInput } from '../../libs/dto/package/package.input';
import { Package } from '../../libs/dto/package/package';

export interface OpenRouterRankingResult {
  riskScore: number;
  reason: string;
  topPackageIds: string[];
  packageReasons: string[];
}

@Injectable()
export class OpenRouterService {
  constructor(private readonly httpService: HttpService) {}

  public async rankPackages(
    input: InsuranceRecommendationInput,
    candidates: Package[],
  ): Promise<OpenRouterRankingResult | null> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;

    if (!apiKey || !model) {
      return null;
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content: `Rank only the provided insurance packages for a normal user.

Return strict JSON only:
{
  "riskScore": number,
  "reason": string,
  "topPackageIds": string[],
  "packageReasons": string[]
}

Rules:
- riskScore: integer from 1 to 100
- reason: 1 to 2 short user-friendly sentences
- topPackageIds: only IDs from provided candidates, maximum 3
- packageReasons: same order as topPackageIds, short and plain

Ranking priorities:
- Prefer better coverage when the price difference is small
- Prefer lower price when benefits are similar
- Respect the user's selected insurance type, age, and budget
- Choose the best overall value and practical protection

Writing style:
- Sound natural, clear, and helpful
- Write for a normal user, not an insurance expert
- In packageReasons, focus on user benefit and value
- Prefer plain language over technical wording
- Use numbers only when they clearly help explain why one package is better

Do not invent packages.
Do not recommend anything outside the provided candidate list.
Do not add markdown.
Do not wrap the response in code fences.
Do not add any text before or after the JSON.
`,
              },
              {
                role: 'user',
                content: JSON.stringify({
                  user: input,
                  candidates: candidates.map((candidate) => ({
                    _id: `${candidate._id}`,
                    packageName: candidate.packageName,
                    packageType: candidate.packageType,
                    packageDesc: candidate.packageDesc,
                    packagePrice: candidate.packagePrice,
                    packageCoverageLimit: candidate.packageCoverageLimit,
                    packageMinAge: candidate.packageMinAge,
                    packageMaxAge: candidate.packageMaxAge,
                    packageAssetTags: candidate.packageAssetTags,
                  })),
                }),
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const content =
        response.data?.choices?.[0]?.message?.content ??
        response.data?.choices?.[0]?.text;

      if (typeof content !== 'string') {
        return null;
      }

      return this.parseRecommendationContent(
        content,
        candidates.map((candidate) => `${candidate._id}`),
      );
    } catch (error) {
      console.log('OpenRouter ranking failed:', error);
      return null;
    }
  }

  public parseRecommendationContent(
    content: string,
    candidateIds: string[],
  ): OpenRouterRankingResult | null {
    try {
      const parsed = JSON.parse(this.stripCodeFences(content));
      const validIds = new Set(candidateIds);
      const topPackageIds = Array.isArray(parsed?.topPackageIds)
        ? parsed.topPackageIds
            .map((value: unknown) => `${value}`)
            .filter((value: string, index: number, values: string[]) => {
              return validIds.has(value) && values.indexOf(value) === index;
            })
            .slice(0, 3)
        : [];

      if (!topPackageIds.length || typeof parsed?.reason !== 'string') {
        return null;
      }

      return {
        riskScore: this.normalizeRiskScore(parsed?.riskScore),
        reason: parsed.reason.trim(),
        topPackageIds,
        packageReasons: this.shapePackageReasons(
          parsed?.packageReasons,
          topPackageIds,
        ),
      };
    } catch (error) {
      return null;
    }
  }

  private shapePackageReasons(
    packageReasons: unknown,
    topPackageIds: string[],
  ): string[] {
    if (Array.isArray(packageReasons)) {
      return packageReasons
        .map((value) => `${value}`)
        .slice(0, topPackageIds.length);
    }

    if (packageReasons && typeof packageReasons === 'object') {
      return topPackageIds.map((id) => {
        const reason = (packageReasons as Record<string, unknown>)[id];
        return typeof reason === 'string' ? reason : `Recommended ${id}`;
      });
    }

    return [];
  }

  private normalizeRiskScore(value: unknown): number {
    const numericValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return 50;
    }

    return Math.max(0, Math.min(100, Math.round(numericValue)));
  }

  private stripCodeFences(content: string): string {
    const trimmed = content.trim();

    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }
}

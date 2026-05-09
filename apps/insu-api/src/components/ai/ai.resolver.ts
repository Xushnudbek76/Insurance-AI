import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InsuranceRecommendationInput } from '../../libs/dto/package/package.input';
import { InsuranceRecommendationResult } from '../../libs/dto/package/package';
import { WithoutGuard } from '../auth/guards/without.guard';
import { RecommendationService } from './recommendation.service';

@Resolver()
export class AiResolver {
  constructor(private readonly recommendationService: RecommendationService) {}

  @UseGuards(WithoutGuard)
  @Query(() => InsuranceRecommendationResult)
  public async getInsuranceRecommendation(
    @Args('input') input: InsuranceRecommendationInput,
  ): Promise<InsuranceRecommendationResult> {
    console.log('Query: getInsuranceRecommendation');
    return this.recommendationService.getInsuranceRecommendation(input);
  }
}

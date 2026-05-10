import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { InsuranceModule } from '../insurance-packages/insurance.module';
import { AiResolver } from './ai.resolver';
import { OpenRouterService } from './openrouter.service';
import { RecommendationService } from './recommendation.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AuthModule, InsuranceModule],
  providers: [AiResolver, OpenRouterService, RecommendationService],
  exports: [OpenRouterService, RecommendationService],
})
export class AiModule {}

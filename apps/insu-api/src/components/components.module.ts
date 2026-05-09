import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { MemberModule } from './member/member.module';
import { InsuranceModule } from './insurance-packages/insurance.module';
import { PolicyModule } from './policy/policy.module';

@Module({
  imports: [MemberModule, InsuranceModule, AiModule, PolicyModule],
})
export class ComponentsModule {}

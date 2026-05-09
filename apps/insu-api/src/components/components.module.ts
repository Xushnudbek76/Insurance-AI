import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { MemberModule } from './member/member.module';
import { InsuranceModule } from './insurance-packages/insurance.module';

@Module({
  imports: [MemberModule, InsuranceModule, AiModule],
})
export class ComponentsModule {}

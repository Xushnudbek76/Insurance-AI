import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { InsuranceModule } from './insurance-packages/insurance.module';

@Module({
  imports: [MemberModule, InsuranceModule],
})
export class ComponentsModule {}

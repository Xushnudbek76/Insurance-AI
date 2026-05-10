import { Module } from '@nestjs/common';
import { ClaimResolver } from './claim.resolver';
import { ClaimService } from './claim.service';
import ClaimSchema from '../../schemas/Claim.model';
import PackageSchema from '../../schemas/Package.model';
import { MongooseModule } from '@nestjs/mongoose';
import { InsuranceModule } from '../insurance-packages/insurance.module';
import { MemberModule } from '../member/member.module';
import { AiModule } from '../ai/ai.module';
import { PolicyModule } from '../policy/policy.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Claim', schema: ClaimSchema },
      { name: 'Package', schema: PackageSchema },
    ]),
    InsuranceModule,
    AiModule,
    AuthModule,
    MemberModule,
    PolicyModule,
  ],
  providers: [ClaimResolver, ClaimService],
})
export class ClaimModule {}

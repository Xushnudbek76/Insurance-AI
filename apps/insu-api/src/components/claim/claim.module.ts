import { Module } from '@nestjs/common';
import { ClaimResolver } from './claim.resolver';
import { ClaimService } from './claim.service';
import ClaimSchema from '../../schemas/Claim.model';
import { MongooseModule } from '@nestjs/mongoose';
import { InsuranceModule } from '../insurance-packages/insurance.module';
import { MemberModule } from '../member/member.module';
import { AiModule } from '../ai/ai.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Claim', schema: ClaimSchema }]),
    InsuranceModule,
    MemberModule,
    AiModule,
    PolicyModule,
  ],
  providers: [ClaimResolver, ClaimService],
})
export class ClaimModule {}

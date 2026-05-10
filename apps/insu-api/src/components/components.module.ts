import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { MemberModule } from './member/member.module';
import { InsuranceModule } from './insurance-packages/insurance.module';
import { PolicyModule } from './policy/policy.module';
import { ClaimModule } from './claim/claim.module';
import { CommentModule } from './comment/comment.module';
import { LikeModule } from './like/like.module';

@Module({
  imports: [MemberModule, InsuranceModule, AiModule, PolicyModule, ClaimModule, CommentModule, LikeModule],
})
export class ComponentsModule {}

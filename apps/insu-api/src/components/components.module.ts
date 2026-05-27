import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { MemberModule } from './member/member.module';
import { InsuranceModule } from './insurance-packages/insurance.module';
import { PolicyModule } from './policy/policy.module';
import { ClaimModule } from './claim/claim.module';
import { CommentModule } from './comment/comment.module';
import { LikeModule } from './like/like.module';
import { BoardArticleModule } from './board-article/board-article.module';
import { FollowModule } from './follow/follow.module';
import { SocketModule } from './socket/socket.module';
import { NoticeModule } from './notice/notice.module';
import { FaqModule } from './faq/faq.module';

@Module({
  imports: [
    MemberModule,
    InsuranceModule,
    AiModule,
    PolicyModule,
    ClaimModule,
    BoardArticleModule,
    CommentModule,
    LikeModule,
    FollowModule,
    NoticeModule,
    FaqModule,
    SocketModule,
  ],
})
export class ComponentsModule {}

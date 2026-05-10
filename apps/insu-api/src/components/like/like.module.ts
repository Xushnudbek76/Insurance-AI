import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeResolver } from './like.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import LikeSchema from '../../schemas/Like.model';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { InsuranceModule } from '../insurance-packages/insurance.module';
import { BoardArticleModule } from '../board-article/board-article.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Like', schema: LikeSchema }]),
    AuthModule,
    MemberModule,
    InsuranceModule,
    BoardArticleModule,
  ],
  providers: [LikeResolver, LikeService],
  exports: [LikeService],
})
export class LikeModule {}

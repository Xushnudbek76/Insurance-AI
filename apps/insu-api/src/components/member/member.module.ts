import { Module } from '@nestjs/common';
import { MemberResolver } from './member.resolver';
import { MemberPrivacyResolver } from './member-privacy.resolver';
import { MemberService } from './member.service';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import FollowSchema from '../../schemas/Follow.model';
import { LikeModule } from '../like/like.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
    MongooseModule.forFeature([{ name: 'Follow', schema: FollowSchema }]),
    AuthModule,
    ViewModule,
    LikeModule,
  ],
  providers: [MemberResolver, MemberPrivacyResolver, MemberService],
  exports: [MemberService],
})
export class MemberModule {}

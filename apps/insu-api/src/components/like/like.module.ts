import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeResolver } from './like.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import LikeSchema from '../../schemas/Like.model';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Like', schema: LikeSchema }]),
    AuthModule,
  ],
  providers: [LikeResolver, LikeService],
  exports: [LikeService],
})
export class LikeModule {}

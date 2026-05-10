import { Module } from '@nestjs/common';
import { ViewService } from './view.service';
import { ViewResolver } from './view.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import ViewSchema from '../../schemas/View.model';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'View', schema: ViewSchema }]),
    AuthModule,
  ],
  providers: [ViewResolver, ViewService],
  exports: [ViewService],
})
export class ViewModule {}

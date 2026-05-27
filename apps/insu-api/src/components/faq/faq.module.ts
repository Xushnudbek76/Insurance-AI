import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import FaqSchema from '../../schemas/Faq.model';
import { AuthModule } from '../auth/auth.module';
import { FaqResolver } from './faq.resolver';
import { FaqService } from './faq.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Faq', schema: FaqSchema }]), AuthModule],
  providers: [FaqResolver, FaqService],
})
export class FaqModule {}

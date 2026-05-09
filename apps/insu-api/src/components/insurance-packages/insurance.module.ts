import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import PackageSchema from '../../schemas/Package.model';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { PolicyModule } from '../policy/policy.module';
import { ViewModule } from '../view/view.module';
import { PackageResolver } from './package.resolver';
import { PackageService } from './package.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Package', schema: PackageSchema }]),
    AuthModule,
    MemberModule,
    PolicyModule,
    ViewModule,
  ],
  providers: [PackageResolver, PackageService],
  exports: [PackageService],
})
export class InsuranceModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import PolicySchema from '../../schemas/Policy.model';
import PackageSchema from '../../schemas/Package.model';
import { AuthModule } from '../auth/auth.module';
import { PolicyResolver } from './policy.resolver';
import { PolicyService } from './policy.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Policy', schema: PolicySchema },
      { name: 'Package', schema: PackageSchema },
    ]),
    AuthModule,
  ],
  providers: [PolicyResolver, PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}

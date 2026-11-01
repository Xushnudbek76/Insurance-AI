import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database/database.module';
import { InsuBatchService } from './insu-batch.service';
import PackageSchema from '../../insu-api/src/schemas/Package.model';
import MemberSchema from '../../insu-api/src/schemas/Member.model';
import PolicySchema from '../../insu-api/src/schemas/Policy.model';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    MongooseModule.forFeature([
      { name: 'Package', schema: PackageSchema },
      { name: 'Member', schema: MemberSchema },
      { name: 'Policy', schema: PolicySchema },
    ]),
  ],
  providers: [InsuBatchService],
  exports: [InsuBatchService],
})
export class InsuBatchDataModule {}

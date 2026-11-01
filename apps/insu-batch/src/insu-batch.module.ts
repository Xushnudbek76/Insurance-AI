import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InsuBatchController } from './insu-batch.controller';
import { InsuBatchDataModule } from './insu-batch-data.module';

@Module({
  imports: [InsuBatchDataModule, ScheduleModule.forRoot()],
  controllers: [InsuBatchController],
})
export class InsuBatchModule {}

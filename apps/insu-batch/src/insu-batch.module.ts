import { Module } from '@nestjs/common';
import { InsuBatchController } from './insu-batch.controller';
import { InsuBatchService } from './insu-batch.service';

@Module({
  imports: [],
  controllers: [InsuBatchController],
  providers: [InsuBatchService],
})
export class InsuBatchModule {}

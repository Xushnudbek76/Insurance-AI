import { Controller, Get } from '@nestjs/common';
import { InsuBatchService } from './insu-batch.service';

@Controller()
export class InsuBatchController {
  constructor(private readonly insuBatchService: InsuBatchService) {}

  @Get()
  getHello(): string {
    return this.insuBatchService.getHello();
  }
}

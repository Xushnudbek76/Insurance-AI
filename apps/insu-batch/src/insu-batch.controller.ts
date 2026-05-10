import { Controller, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InsuBatchService } from './insu-batch.service';
import {
  BATCH_ROLLBACK,
  BATCH_TOP_PACKAGES,
  BATCH_TOP_AGENTS,
  BATCH_EXPIRED_POLICIES,
} from './lib/config';

@Controller()
export class InsuBatchController {
  private readonly logger = new Logger(InsuBatchController.name);

  constructor(private readonly insuBatchService: InsuBatchService) {}

  @Cron('00 00 01 * * *', { name: BATCH_ROLLBACK })
  async batchRollback() {
    this.logger.debug(`Cron triggered: ${BATCH_ROLLBACK}`);
    await this.insuBatchService.batchRollback();
  }

  @Cron('20 00 01 * * *', { name: BATCH_TOP_PACKAGES })
  async batchTopPackages() {
    this.logger.debug(`Cron triggered: ${BATCH_TOP_PACKAGES}`);
    await this.insuBatchService.batchTopPackages();
  }

  @Cron('40 00 01 * * *', { name: BATCH_TOP_AGENTS })
  async batchTopAgents() {
    this.logger.debug(`Cron triggered: ${BATCH_TOP_AGENTS}`);
    await this.insuBatchService.batchTopAgents();
  }

  @Cron('00 00 02 * * *', { name: BATCH_EXPIRED_POLICIES })
  async batchExpiredPolicies() {
    this.logger.debug(`Cron triggered: ${BATCH_EXPIRED_POLICIES}`);
    await this.insuBatchService.batchExpiredPolicies();
  }
}

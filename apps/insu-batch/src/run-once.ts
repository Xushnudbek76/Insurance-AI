import { NestFactory } from '@nestjs/core';
import { InsuBatchDataModule } from './insu-batch-data.module';
import { InsuBatchService } from './insu-batch.service';
import { runBatchJobs } from './batch-runner';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(InsuBatchDataModule);
  app.enableShutdownHooks();
  try {
    await runBatchJobs(app.get(InsuBatchService));
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Batch job failed:', error.message);
  process.exitCode = 1;
});

import { NestFactory } from '@nestjs/core';
import { InsuBatchModule } from './insu-batch.module';

async function bootstrap() {
  const app = await NestFactory.create(InsuBatchModule);
  await app.listen(process.env.PORT_BATCH ?? 3001);
}
bootstrap();

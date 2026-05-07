import { NestFactory } from '@nestjs/core';
import { InsuBatchModule } from './insu-batch.module';

async function bootstrap() {
  const app = await NestFactory.create(InsuBatchModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();

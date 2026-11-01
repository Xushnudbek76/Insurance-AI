import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import { corsOrigin } from './libs/cors';
import { csrfProtection } from './components/auth/session-security';
import {
  createRequestLimiters,
  PaginationLimitPipe,
} from './libs/request-safety';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe(), new PaginationLimitPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({ origin: corsOrigin, credentials: true });
  // Limit traffic before parsing uploads; parse JSON before inspecting GraphQL field names.
  const [general, ...sensitive] = createRequestLimiters();
  app.use('/graphql', general, express.json({ limit: '100kb' }));
  app.use(
    graphqlUploadExpress({ maxFileSize: 10 * 1024 * 1024, maxFiles: 10 }),
  );
  app.use('/graphql', csrfProtection, ...sensitive);
  app.use('/auth', general);

  app.use('/uploads', express.static('./uploads'));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT_API ?? process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InsuBatchController } from '../src/insu-batch.controller';
import { InsuBatchService } from '../src/insu-batch.service';

describe('Batch HTTP smoke test', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InsuBatchController],
      providers: [{ provide: InsuBatchService, useValue: {} }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('does not expose scheduled job methods as public HTTP routes', () =>
    request(app.getHttpServer()).get('/').expect(404));
});

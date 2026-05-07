import { Test, TestingModule } from '@nestjs/testing';
import { InsuBatchController } from './insu-batch.controller';
import { InsuBatchService } from './insu-batch.service';

describe('InsuBatchController', () => {
  let insuBatchController: InsuBatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [InsuBatchController],
      providers: [InsuBatchService],
    }).compile();

    insuBatchController = app.get<InsuBatchController>(InsuBatchController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(insuBatchController.getHello()).toBe('Hello World!');
    });
  });
});

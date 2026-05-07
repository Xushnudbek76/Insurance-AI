import { Injectable } from '@nestjs/common';

@Injectable()
export class InsuBatchService {
  getHello(): string {
    return 'Hello World!';
  }
}

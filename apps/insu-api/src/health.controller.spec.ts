import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { HealthController } from './health.controller';

describe('deployment health checks', () => {
  it('keeps liveness available while the database is disconnected', () => {
    const controller = new HealthController({ readyState: 0 } as Connection);
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('rejects readiness while the database is disconnected or connecting', () => {
    for (const readyState of [0, 2, 3]) {
      const controller = new HealthController({ readyState } as Connection);
      expect(() => controller.ready()).toThrow(ServiceUnavailableException);
    }
  });

  it('reports readiness after MongoDB connects', () => {
    const controller = new HealthController({ readyState: 1 } as Connection);
    expect(controller.ready()).toEqual({ status: 'ready' });
  });
});

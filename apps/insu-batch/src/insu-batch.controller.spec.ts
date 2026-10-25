import { InsuBatchController } from './insu-batch.controller';
describe('InsuBatchController schedules', () => {
  it.each([
    'batchRollback',
    'batchTopPackages',
    'batchTopAgents',
    'batchExpiredPolicies',
  ] as const)('delegates %s to its worker', async (method) => {
    const service = { [method]: jest.fn().mockResolvedValue(undefined) };
    const controller = new InsuBatchController(service as any);
    await controller[method]();
    expect(service[method]).toHaveBeenCalledTimes(1);
  });
});

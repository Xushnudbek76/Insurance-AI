import type { InsuBatchService } from './insu-batch.service';

type BatchTasks = Pick<
  InsuBatchService,
  | 'batchRollback'
  | 'batchTopPackages'
  | 'batchTopAgents'
  | 'batchExpiredPolicies'
>;

export async function runBatchJobs(service: BatchTasks): Promise<void> {
  await service.batchRollback();
  await service.batchTopPackages();
  await service.batchTopAgents();
  await service.batchExpiredPolicies();
}

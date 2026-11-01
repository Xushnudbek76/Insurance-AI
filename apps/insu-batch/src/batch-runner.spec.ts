import { runBatchJobs } from './batch-runner';

describe('finite batch execution', () => {
  it('finishes rank updates before expiring policies', async () => {
    const completed: string[] = [];
    const service = {
      batchRollback: async () => {
        completed.push('reset');
      },
      batchTopPackages: async () => {
        completed.push('packages');
      },
      batchTopAgents: async () => {
        completed.push('agents');
      },
      batchExpiredPolicies: async () => {
        completed.push('expiry');
      },
    };
    await runBatchJobs(service);
    expect(completed).toEqual(['reset', 'packages', 'agents', 'expiry']);
  });

  it('propagates failure and stops before later database updates', async () => {
    const completed: string[] = [];
    const service = {
      batchRollback: async () => {
        completed.push('reset');
      },
      batchTopPackages: async () => {
        throw new Error('database unavailable');
      },
      batchTopAgents: async () => {
        completed.push('agents');
      },
      batchExpiredPolicies: async () => {
        completed.push('expiry');
      },
    };
    await expect(runBatchJobs(service)).rejects.toThrow('database unavailable');
    expect(completed).toEqual(['reset']);
  });
});

import { ClaimService } from './claim.service';
import { Types } from 'mongoose';
const query = (x: any) => ({ lean: () => ({ exec: async () => x }) });
describe('Claim coverage snapshots', () => {
  const holder = new Types.ObjectId();
  let policy: any, claims: any, service: ClaimService;
  beforeEach(() => {
    policy = {
      _id: new Types.ObjectId(),
      memberId: holder,
      policyStatus: 'ACTIVE',
      purchaseStage: 'CONFIRMED',
      startDate: new Date(Date.now() - 10000),
      endDate: new Date(Date.now() + 100000),
      coverageLimit: 100,
      AgentId: 'agent',
    };
    claims = {
      findOne: () => query(null),
      create: jest.fn().mockImplementation(async (value) => value),
    };
    service = new ClaimService(
      claims,
      { findById: () => query({ packageCoverageLimit: 100000 }) } as any,
      { analyzeClaim: async () => 'analysis' } as any,
      { getPolicyById: async () => policy } as any,
    );
  });
  const input = (amount: number): any => ({
    policyId: new Types.ObjectId().toString(),
    claimTitle: 'Claim',
    claimDesc: 'Details',
    claimAmount: amount,
  });
  it('uses_accepted_coverage_after_package_changes', async () => {
    await expect(
      service.submitClaim(holder.toString(), input(101)),
    ).rejects.toThrow('coverage limit');
  });
  it('zero_is_zero_coverage_and_null_is_uncapped', async () => {
    policy.coverageLimit = 0;
    await expect(
      service.submitClaim(holder.toString(), input(1)),
    ).rejects.toThrow('coverage limit');
    policy.coverageLimit = null;
    await expect(
      service.submitClaim(holder.toString(), input(100001)),
    ).resolves.toBeDefined();
  });
  it('rejects_claims_before_start_and_after_end', async () => {
    policy.startDate = new Date(Date.now() + 100000);
    await expect(
      service.submitClaim(holder.toString(), input(1)),
    ).rejects.toThrow('coverage dates');
    policy.startDate = new Date(0);
    policy.endDate = new Date(1);
    await expect(
      service.submitClaim(holder.toString(), input(1)),
    ).rejects.toThrow('coverage dates');
  });
  it('pending_offers_cannot_submit_claims', async () => {
    policy.policyStatus = 'PENDING';
    await expect(
      service.submitClaim(holder.toString(), input(1)),
    ).rejects.toThrow('Only active');
  });
  it('assigned_agent_cannot_submit_client_policy_claim', async () => {
    policy.memberId = new Types.ObjectId();
    await expect(
      service.submitClaim(holder.toString(), input(1)),
    ).rejects.toThrow('Only the policy holder');
    expect(claims.create).not.toHaveBeenCalled();
  });
});

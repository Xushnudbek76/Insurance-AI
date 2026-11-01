import { MemberService } from './member.service';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';

describe('Member update and agent search safety', () => {
  let stored: any;
  let model: any;
  let service: MemberService;
  beforeEach(() => {
    stored = {
      memberNick: 'emma.wilson',
      memberFullName: 'Emma Wilson',
      memberStatus: MemberStatus.ACTIVE,
      memberType: MemberType.AGENT,
    };
    model = {
      findOneAndUpdate: (_filter: any, update: any) => ({
        exec: async () => Object.assign(stored, update.$set),
      }),
      findByIdAndUpdate: (_id: any, update: any) => ({
        exec: async () => Object.assign(stored, update.$set),
      }),
      aggregate: async (pipeline: any[]) => {
        const match = pipeline[0].$match;
        const matches = (part: any) =>
          Object.entries(part).every(([key, value]: any) =>
            value?.$regex
              ? value.$regex.test(stored[key])
              : stored[key] === value,
          );
        const found = match.$or ? match.$or.some(matches) : matches(match);
        return [{ list: found ? [stored] : [], metaCounter: [] }];
      },
    };
    service = new MemberService(
      model,
      {} as any,
      { createToken: async () => 'token' } as any,
      {} as any,
      {} as any,
    );
  });
  it('rejects password changes through generic self updates', async () => {
    await expect(
      service.updateMember(
        'id' as any,
        { memberPassword: 'new-password' } as any,
      ),
    ).rejects.toThrow();
    expect(stored.memberPassword).toBeUndefined();
  });
  it('rejects password changes through generic administrator updates', async () => {
    await expect(
      service.updateMemberByAdmin({
        _id: 'id',
        memberPassword: 'new-password',
      } as any),
    ).rejects.toThrow();
    expect(stored.memberPassword).toBeUndefined();
  });
  it('finds agents by the full name shown on their card', async () => {
    const result = await service.getAgents(null as any, {
      page: 1,
      limit: 10,
      search: { text: 'Emma Wilson' },
    });
    expect(result.list).toHaveLength(1);
  });
  it('treats regex punctuation as literal text rather than matching every agent', async () => {
    const result = await service.getAgents(null as any, {
      page: 1,
      limit: 10,
      search: { text: '.*' },
    });
    expect(result.list).toHaveLength(0);
  });
});

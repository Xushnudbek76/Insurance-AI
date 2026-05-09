import { HttpService } from '@nestjs/axios';
import { OpenRouterService } from './openrouter.service';

describe('OpenRouterService', () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({} as HttpService);
  });

  it('parses fenced json and filters invalid ids', () => {
    const result = service.parseRecommendationContent(
      '```json {"riskScore":72,"reason":"Strong fit","topPackageIds":["a","b","x"],"packageReasons":["r1","r2","r3"]} ```',
      ['a', 'b', 'c'],
    );

    expect(result).toEqual({
      riskScore: 72,
      reason: 'Strong fit',
      topPackageIds: ['a', 'b'],
      packageReasons: ['r1', 'r2'],
    });
  });

  it('returns null for malformed content', () => {
    expect(
      service.parseRecommendationContent('not-json', ['a', 'b']),
    ).toBeNull();
  });
});

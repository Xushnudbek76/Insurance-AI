import { buildSchema, parse, validate } from 'graphql';
import { PaginationLimitPipe, queryBudgetRule } from './request-safety';

describe('API query and pagination budgets', () => {
  const schema = buildSchema(
    'type Query { node: Node login: String signup: String } type Node { next: Node value: String }',
  );
  const check = (query: string) =>
    validate(schema, parse(query), [queryBudgetRule]);
  it('allows ordinary nested requests', () =>
    expect(check('{node{next{value}}}')).toEqual([]));
  it('rejects excessive depth through fragments', () => {
    const query =
      '{node{...Deep}} fragment Deep on Node {' +
      'next{'.repeat(11) +
      'value' +
      '}'.repeat(11) +
      '}';
    expect(check(query)[0].message).toMatch(/complex/);
  });
  it('rejects excessive alias width', () =>
    expect(
      check(
        '{node{' +
          Array.from({ length: 301 }, (_, i) => `v${i}:value`).join(' ') +
          '}}',
      )[0].message,
    ).toMatch(/complex/));
  it('rejects authentication batching using aliases', () =>
    expect(check('{one:login two:login}')[0].message).toMatch(
      /one authentication/,
    ));
  it('does not traverse circular GraphQL context parameters', () => {
    const context: any = {};
    context.request = context;
    const pipe = new PaginationLimitPipe();
    expect(() =>
      (pipe as any).transform(context, { type: 'custom' }),
    ).not.toThrow();
  });
  it('caps nested input limits and rejects invalid pages', () => {
    const pipe = new PaginationLimitPipe();
    expect(() => pipe.transform({ input: { limit: 101 } })).toThrow();
    expect(() => pipe.transform({ page: 0 })).toThrow();
    expect(pipe.transform({ page: 1, limit: 100 })).toEqual({
      page: 1,
      limit: 100,
    });
  });
});

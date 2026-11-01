import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import {
  GraphQLError,
  Kind,
  parse,
  visit,
  ValidationContext,
  ASTVisitor,
  SelectionSetNode,
  FragmentDefinitionNode,
} from 'graphql';
import { rateLimit } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';

@Injectable()
export class PaginationLimitPipe implements PipeTransform {
  transform(value: unknown, metadata?: ArgumentMetadata): unknown {
    if (metadata && metadata.type !== 'body') return value;
    this.check(value, new WeakSet());
    return value;
  }
  private check(value: unknown, seen: WeakSet<object>): void {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
      if (
        (key === 'limit' || key === 'page') &&
        (!Number.isInteger(item) ||
          (item as number) < 1 ||
          (item as number) > (key === 'limit' ? 100 : 1_000_000))
      ) {
        throw new BadRequestException(
          key === 'limit'
            ? 'Page size must be between 1 and 100'
            : 'Invalid page number',
        );
      }
      this.check(item, seen);
    }
  }
}

export function queryBudgetRule(context: ValidationContext): ASTVisitor {
  return {
    OperationDefinition(operation) {
      let count = 0;
      let costlyFields = 0;
      let rejected = false;
      function walk(set: SelectionSetNode, depth: number, seen: Set<string>) {
        if (rejected) return;
        if (depth > 10 || count > 300) {
          rejected = true;
          context.reportError(
            new GraphQLError('Query is too complex', { nodes: operation }),
          );
          return;
        }
        for (const selection of set.selections) {
          if (++count > 300) {
            walk(set, 11, seen);
            return;
          }
          if (selection.kind === Kind.FIELD) {
            if (
              [
                'login',
                'signup',
                'changePassword',
                'getInsuranceRecommendation',
                'imageUploader',
                'imagesUploader',
              ].includes(selection.name.value)
            ) {
              if (++costlyFields > 1) {
                rejected = true;
                context.reportError(
                  new GraphQLError(
                    'Run one authentication, AI or upload operation at a time',
                    { nodes: operation },
                  ),
                );
                return;
              }
            }
            if (selection.selectionSet)
              walk(selection.selectionSet, depth + 1, seen);
          } else if (selection.kind === Kind.INLINE_FRAGMENT) {
            walk(selection.selectionSet, depth, seen);
          } else if (!seen.has(selection.name.value)) {
            const fragment = context.getFragment(selection.name.value) as
              | FragmentDefinitionNode
              | undefined;
            if (fragment)
              walk(
                fragment.selectionSet,
                depth,
                new Set([...seen, selection.name.value]),
              );
          }
        }
      }
      walk(operation.selectionSet, 1, new Set());
    },
  };
}

function containsField(request: Request, fields: string[]): boolean {
  const query = request.body?.query ?? request.query?.query;
  if (typeof query !== 'string') return false;
  let found = false;
  try {
    visit(parse(query, { maxTokens: 5000 }), {
      Field(node) {
        if (fields.includes(node.name.value)) found = true;
      },
    });
  } catch {
    /* GraphQL reports invalid syntax. */
  }
  return found;
}

export function createRequestLimiters(): RequestHandler[] {
  const options = {
    windowMs: 60_000,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    message: {
      errors: [{ message: 'Too many requests. Please try again shortly.' }],
    },
  };
  return [
    rateLimit({ ...options, limit: 240 }),
    rateLimit({
      ...options,
      limit: 15,
      skip: (request) =>
        !containsField(request, ['login', 'signup', 'changePassword']),
    }),
    rateLimit({
      ...options,
      limit: 10,
      skip: (request) =>
        !containsField(request, ['getInsuranceRecommendation']),
    }),
    rateLimit({
      ...options,
      limit: 5,
      skip: (request) =>
        !containsField(request, ['imageUploader', 'imagesUploader']),
    }),
  ];
}

// Sensitive request limits inspect query text, so do not accept hash-only APQ.
export const graphqlSafetyOptions = {
  context: ({ req, res }: { req: any; res: any }) => ({ req, res }),
  validationRules: [queryBudgetRule],
  parseOptions: { maxTokens: 5000 },
  persistedQueries: false as const,
};

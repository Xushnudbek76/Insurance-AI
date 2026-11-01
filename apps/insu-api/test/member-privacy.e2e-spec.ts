import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule, Query, Resolver } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import request from 'supertest';
import { Types } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  graphqlSafetyOptions,
  PaginationLimitPipe,
} from '../src/libs/request-safety';
import { MemberPrivacyResolver } from '../src/components/member/member-privacy.resolver';
import { AuthService } from '../src/components/auth/auth.service';
import { BoardArticle } from '../src/libs/dto/board-article/board-article';
import { MemberType } from '../src/libs/enums/member.enum';

const id = new Types.ObjectId();
@Resolver()
class PrivacyProbe {
  @Query(() => BoardArticle)
  communityProbe() {
    return {
      memberData: {
        _id: id,
        memberPhone: 'private-phone',
        memberAddress: 'private-address',
      },
    };
  }
}

describe('Nested GraphQL member privacy', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          autoSchemaFile: true,
          ...graphqlSafetyOptions,
        }),
      ],
      providers: [
        PrivacyProbe,
        MemberPrivacyResolver,
        {
          provide: AuthService,
          useValue: {
            verifyToken: async (token: string) => {
              if (token === 'self')
                return { _id: id, memberType: MemberType.USER };
              if (token === 'admin')
                return { _id: 'admin', memberType: MemberType.ADMIN };
              return { _id: 'other', memberType: MemberType.USER };
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new PaginationLimitPipe());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  const query = '{communityProbe{memberData{_id memberPhone memberAddress}}}';
  it('disables hash-only persisted queries so sensitive request throttles cannot be bypassed', async () => {
    const sha256Hash = createHash('sha256').update(query).digest('hex');
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ extensions: { persistedQuery: { version: 1, sha256Hash } } });
    expect(response.body.errors?.[0].extensions.code).toBe(
      'PERSISTED_QUERY_NOT_SUPPORTED',
    );
  });

  it('redacts a nested community author for anonymous visitors', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query })
      .expect(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.communityProbe.memberData).toEqual({
      _id: String(id),
      memberPhone: null,
      memberAddress: null,
    });
  });
  it('redacts a nested author for another signed-in user', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Cookie', 'insu-session=other')
      .send({ query })
      .expect(200);
    expect(response.body.data.communityProbe.memberData.memberPhone).toBeNull();
  });
  it.each(['self', 'admin'])(
    'preserves authorized %s access to the same nested fields',
    async (token) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Cookie', `insu-session=${token}`)
        .send({ query })
        .expect(200);
      expect(response.body.data.communityProbe.memberData.memberPhone).toBe(
        'private-phone',
      );
      expect(response.body.data.communityProbe.memberData.memberAddress).toBe(
        'private-address',
      );
    },
  );
});

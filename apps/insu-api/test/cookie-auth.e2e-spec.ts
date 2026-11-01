import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { JwtService } from '@nestjs/jwt';
import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { MemberResolver } from '../src/components/member/member.resolver';
import { MemberPrivacyResolver } from '../src/components/member/member-privacy.resolver';
import { MemberService } from '../src/components/member/member.service';
import { AuthService } from '../src/components/auth/auth.service';
import { AuthController } from '../src/components/auth/auth.controller';
import { csrfProtection } from '../src/components/auth/session-security';
import {
  MemberStatus,
  MemberType,
  MemberAuthType,
} from '../src/libs/enums/member.enum';
import { graphqlSafetyOptions } from '../src/libs/request-safety';

describe('Browser cookie authentication lifecycle', () => {
  let app: INestApplication,
    agent: ReturnType<typeof request.agent>,
    csrf: string,
    loginResponse: any;
  let sessions: Map<string, any>;
  const previous = { ...process.env };
  const id = new Types.ObjectId();
  const cookiePair = (response: any) =>
    response.headers['set-cookie']
      .map((value: string) => value.split(';')[0])
      .join('; ');
  const csrfFrom = (response: any) =>
    decodeURIComponent(
      response.headers['set-cookie']
        .find((value: string) => value.startsWith('insu-csrf='))
        .split(';')[0]
        .slice('insu-csrf='.length),
    );
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_COOKIE_SECURE = 'false';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3001';
    process.env.SECRET_TOKEN =
      'unit-test-cookie-signing-key-at-least-32-characters';
    const member: any = {
      _id: id,
      memberNick: 'demo.client',
      memberType: MemberType.USER,
      memberStatus: MemberStatus.ACTIVE,
      memberAuthType: MemberAuthType.PHONE,
      memberPhone: 'private-phone',
      memberImage: '',
      authVersion: 0,
      memberPassword: await bcrypt.hash('test-password', 4),
    };
    const members: any = {
      findOne: (filter: any) => {
        const found =
          (!filter.memberNick || filter.memberNick === member.memberNick) &&
          (!filter._id || String(filter._id) === String(id)) &&
          (!filter.memberStatus || filter.memberStatus === member.memberStatus);
        return {
          select: () => ({ exec: async () => (found ? { ...member } : null) }),
          lean: () => ({
            exec: async () => {
              const { memberPassword, ...profile } = member;
              return found ? profile : null;
            },
          }),
        };
      },
    };
    sessions = new Map();
    const sessionModel: any = {
      create: async (record: any) => {
        sessions.set(record.sessionHash, record);
        return record;
      },
      findOne: (filter: any) => ({
        lean: () => ({
          exec: async () => sessions.get(filter.sessionHash) ?? null,
        }),
      }),
      deleteOne: (filter: any) => ({
        exec: async () => ({
          deletedCount: sessions.delete(filter.sessionHash) ? 1 : 0,
        }),
      }),
    };
    const jwt = new JwtService({
      secret: process.env.SECRET_TOKEN,
      signOptions: {
        expiresIn: '12h',
        issuer: 'insu-api',
        audience: 'insu-web',
      },
    });
    const auth = new AuthService(jwt, members, sessionModel);
    const service = new MemberService(
      members,
      {} as any,
      auth,
      {} as any,
      {} as any,
    );
    const module = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          autoSchemaFile: true,
          ...graphqlSafetyOptions,
        }),
      ],
      controllers: [AuthController],
      providers: [
        MemberResolver,
        MemberPrivacyResolver,
        { provide: AuthService, useValue: auth },
        { provide: MemberService, useValue: service },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(express.json());
    app.use('/graphql', csrfProtection);
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    agent = request.agent(app.getHttpServer());
  });
  afterAll(async () => {
    await app?.close();
    for (const key of [
      'NODE_ENV',
      'SESSION_COOKIE_SECURE',
      'ALLOWED_ORIGINS',
      'SECRET_TOKEN',
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  const login = {
    query:
      'mutation($input:LoginInput!){login(input:$input){_id memberNick memberPhone}}',
    variables: {
      input: { memberNick: 'demo.client', memberPassword: 'test-password' },
    },
  };
  it('rejects login without a matching CSRF pair', async () => {
    await agent
      .post('/graphql')
      .set('Origin', 'http://localhost:3001')
      .send(login)
      .expect(403);
    expect(sessions.size).toBe(0);
  });
  it('logs in with an HttpOnly cookie and no token in GraphQL response', async () => {
    const boot = await agent
      .get('/auth/csrf')
      .set('Origin', 'http://localhost:3001')
      .expect(200);
    csrf = boot.body.csrfToken;
    loginResponse = await agent
      .post('/graphql')
      .set('Origin', 'http://localhost:3001')
      .set('x-csrf-token', csrf)
      .send(login)
      .expect(200);
    expect(loginResponse.body.errors).toBeUndefined();
    expect(loginResponse.body.data.login.memberPhone).toBe('private-phone');
    expect(
      loginResponse.headers['set-cookie'].find((value: string) =>
        value.startsWith('insu-session='),
      ),
    ).toMatch(/HttpOnly/);
    expect(JSON.stringify(loginResponse.body)).not.toContain('accessToken');
    expect(sessions.size).toBe(1);
    csrf = csrfFrom(loginResponse);
  });
  it('restores identity using the cookie without exposing its value', async () => {
    const response = await agent.get('/auth/session').expect(200);
    expect(response.body.member._id).toBe(String(id));
    expect(response.body.member.memberPhone).toBe('private-phone');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.member.accessToken).toBeUndefined();
    expect(response.body.member.sessionId).toBeUndefined();
  });
  it('does not expose accessToken in the public GraphQL schema', async () => {
    const response = await agent
      .post('/graphql')
      .set('x-csrf-token', csrf)
      .send({ query: '{__type(name:"Member"){fields{name}}}' })
      .expect(200);
    expect(
      response.body.data.__type.fields.some(
        (field: any) => field.name === 'accessToken',
      ),
    ).toBe(false);
  });
  it('rejects authenticated mutations without CSRF and rejects foreign origins', async () => {
    await agent
      .post('/graphql')
      .send({ query: 'mutation{checkAuth}' })
      .expect(403);
    await agent
      .post('/graphql')
      .set('Origin', 'https://unlisted.example')
      .set('x-csrf-token', csrf)
      .send({ query: 'mutation{checkAuth}' })
      .expect(403);
    const response = await agent
      .post('/graphql')
      .set('x-csrf-token', csrf)
      .send({ query: 'mutation{checkAuth}' })
      .expect(200);
    expect(response.body.data.checkAuth).toBe('hi demo.client');
  });
  it('revokes logout on the server and prevents replay of the old cookie', async () => {
    const stale = cookiePair(loginResponse);
    await agent.post('/auth/logout').expect(403);
    expect(sessions.size).toBe(1);
    await agent.post('/auth/logout').set('x-csrf-token', csrf).expect(201);
    expect(sessions.size).toBe(0);
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Cookie', stale)
      .set('x-csrf-token', csrf)
      .send({ query: 'mutation{checkAuth}' })
      .expect(200);
    expect(response.body.errors?.length).toBeGreaterThan(0);
    expect(
      (await agent.get('/auth/session').expect(200)).body.member,
    ).toBeNull();
  });
});

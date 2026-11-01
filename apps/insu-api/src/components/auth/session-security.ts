import { ForbiddenException } from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Kind, parse } from 'graphql';
import type { Request, Response, NextFunction } from 'express';
import type { Member } from '../../libs/dto/member/member';

export const SESSION_SECONDS = 12 * 60 * 60;
export const verifiedMember = Symbol('verifiedRequestMember');
export const sessionHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const secureCookies = () =>
  process.env.NODE_ENV === 'production' &&
  process.env.SESSION_COOKIE_SECURE !== 'false';
export const sessionCookieName = () =>
  secureCookies() ? '__Host-insu-session' : 'insu-session';
export const csrfCookieName = () =>
  secureCookies() ? '__Host-insu-csrf' : 'insu-csrf';
export function readCookie(header: string | undefined, name: string): string {
  for (const item of (header ?? '').split(';')) {
    const index = item.indexOf('=');
    if (item.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(index + 1));
    } catch {
      return '';
    }
  }
  return '';
}
export const requestToken = (request: { headers?: { cookie?: string } }) =>
  readCookie(request.headers?.cookie, sessionCookieName());
function options(httpOnly: boolean) {
  return {
    httpOnly,
    secure: secureCookies(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_SECONDS * 1000,
  };
}
function signature(nonce: string, token: string) {
  const key = process.env.SECRET_TOKEN;
  if (!key || key.length < 32)
    throw new Error('A strong session signing key is required');
  return createHmac('sha256', key)
    .update('insu-csrf:' + nonce + ':' + sessionHash(token))
    .digest('base64url');
}
function validCsrf(value: string, token: string): boolean {
  const [nonce, mac, ...extra] = value.split('.');
  if (!nonce || !mac || extra.length || !/^[A-Za-z0-9_-]{32}$/.test(nonce))
    return false;
  const expected = signature(nonce, token);
  return (
    Buffer.byteLength(mac) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  );
}
export function csrfToken(
  request: Request,
  response: Response,
  token = requestToken(request),
): string {
  const existing = readCookie(request.headers.cookie, csrfCookieName());
  if (validCsrf(existing, token)) return existing;
  const nonce = randomBytes(24).toString('base64url');
  const value = nonce + '.' + signature(nonce, token);
  response.cookie(csrfCookieName(), value, options(false));
  return value;
}
export function setSession(
  request: Request,
  response: Response,
  token: string,
  member: Member,
) {
  response.cookie(sessionCookieName(), token, options(true));
  csrfToken(request, response, token);
  request[verifiedMember] = member;
}
export function clearSession(response: Response) {
  for (const name of [sessionCookieName(), csrfCookieName()])
    response.clearCookie(name, {
      secure: secureCookies(),
      httpOnly: name === sessionCookieName(),
      sameSite: 'lax',
      path: '/',
    });
}
export function assertOrigin(request: Request) {
  const origin = request.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    (origin &&
      !(process.env.NODE_ENV !== 'production' && allowed.length === 0) &&
      !allowed.includes(origin)) ||
    request.headers['sec-fetch-site'] === 'cross-site'
  ) {
    throw new ForbiddenException('Origin is not allowed');
  }
}
export function assertCsrf(request: Request) {
  assertOrigin(request);
  const cookie = readCookie(request.headers.cookie, csrfCookieName());
  const header = request.headers['x-csrf-token'];
  if (
    typeof header !== 'string' ||
    !cookie ||
    header !== cookie ||
    !validCsrf(cookie, requestToken(request))
  )
    throw new ForbiddenException('CSRF validation failed');
}
export function csrfProtection(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    assertOrigin(request);
    let mutation = false;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        mutation = parse(request.body?.query ?? '', {
          maxTokens: 5000,
        }).definitions.some(
          (def) =>
            def.kind === Kind.OPERATION_DEFINITION &&
            def.operation === 'mutation',
        );
      } catch {
        mutation = true;
      }
      if (requestToken(request) || mutation) assertCsrf(request);
    }
    next();
  } catch {
    response
      .status(403)
      .json({
        errors: [
          {
            message: 'CSRF validation failed',
            extensions: { code: 'CSRF_FAILED' },
          },
        ],
      });
  }
}

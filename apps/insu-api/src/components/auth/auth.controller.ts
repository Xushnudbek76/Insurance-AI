import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  assertCsrf,
  assertOrigin,
  clearSession,
  csrfToken,
  requestToken,
} from './session-security';

const sessionFields = [
  '_id',
  'memberType',
  'memberStatus',
  'memberAuthType',
  'memberPhone',
  'memberNick',
  'memberFullName',
  'memberImage',
  'memberAddress',
  'memberDesc',
  'memberProperties',
  'memberRank',
  'memberArticles',
  'memberPoints',
  'memberLikes',
  'memberViews',
  'memberWarnings',
  'memberBlocks',
  'exp',
];

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('csrf')
  csrf(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertOrigin(request);
    response.setHeader('Cache-Control', 'no-store');
    return { csrfToken: csrfToken(request, response) };
  }
  @Get('session')
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertOrigin(request);
    response.setHeader('Cache-Control', 'no-store');
    const token = requestToken(request);
    if (!token) return { member: null };
    try {
      const member = await this.auth.verifyToken(token);
      return {
        member: Object.fromEntries(
          sessionFields.map((field) => [field, member[field]]),
        ),
      };
    } catch {
      clearSession(response);
      return { member: null };
    }
  }
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertCsrf(request);
    const token = requestToken(request);
    if (token) await this.auth.revokeToken(token);
    clearSession(response);
    response.setHeader('Cache-Control', 'no-store');
    return { ok: true };
  }
}

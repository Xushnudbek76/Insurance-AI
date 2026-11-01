import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { requestToken, verifiedMember } from '../session-security';

@Injectable()
export class WithoutGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext | any): Promise<boolean> {
    console.info('--- @guard() Authentication [WithoutGuard] ---');

    if (context.contextType === 'graphql') {
      const request = context.getArgByIndex(2).req,
        bearerToken = requestToken(request);

      if (bearerToken) {
        try {
          const token = bearerToken,
            authMember = await this.authService.verifyToken(token);
          request[verifiedMember] = authMember;
        } catch (err) {
          // An invalid session is treated as anonymous on public queries.
          request[verifiedMember] = null;
        }
      } else request[verifiedMember] = null;

      console.log(
        'memberNick[without] =>',
        request[verifiedMember]?.memberNick ?? 'none',
      );
      return true;
    }
    return false;
    // description => http, rpc, gprs and etc are ignored
  }
}

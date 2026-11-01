import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { verifiedMember } from '../session-security';
export const AuthMember = createParamDecorator(
  (data: string, context: ExecutionContext | any) => {
    const request =
      context.contextType === 'graphql'
        ? context.getArgByIndex(2).req
        : context.switchToHttp().getRequest();
    const member = request[verifiedMember];
    return member ? (data ? member[data] : member) : null;
  },
);

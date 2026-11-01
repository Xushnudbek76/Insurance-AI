import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('GraphQL');
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType<GqlContextType>() !== 'graphql') return next.handle();
    const started = Date.now();
    const field = GqlExecutionContext.create(context).getInfo().fieldName;
    return next
      .handle()
      .pipe(tap(() => this.logger.log(`${field} ${Date.now() - started}ms`)));
  }
}

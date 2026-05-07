import {} from '@nestjs/common';
import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class AppResolver {
  @Query(() => String)
  public sayHello(): string {
    return 'GraphQL';
  }
}

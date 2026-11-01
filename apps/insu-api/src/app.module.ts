import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
import { HealthController } from './health.controller';
import { graphqlSafetyOptions } from './libs/request-safety';
@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      playground: process.env.NODE_ENV !== 'production',
      ...graphqlSafetyOptions,
      uploads: false,
      autoSchemaFile: true,
      formatError: (error) => {
        const originalError = error?.extensions?.originalError;

        const graphQLformattedError = {
          code: error?.extensions?.code || 'INTERNAL_SERVER_ERROR',

          message:
            originalError?.message ||
            error?.extensions?.exception?.response?.message ||
            error?.extensions?.response?.message ||
            error?.message ||
            'Unknown Error',
        };

        console.log(
          'GRAPHQL FULL ERR:',
          JSON.stringify(
            {
              code: graphQLformattedError.code,
              message: graphQLformattedError.message,
              originalError,
            },
            null,
            2,
          ),
        );

        return graphQLformattedError;
      },
    }),
    ComponentsModule,
    DatabaseModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, AppResolver],
})
export class AppModule {}

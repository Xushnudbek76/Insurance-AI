import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import AuthSessionSchema from '../../schemas/AuthSession.model';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
    MongooseModule.forFeature([
      { name: 'AuthSession', schema: AuthSessionSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.SECRET_TOKEN;
        if (!secret || secret.length < 32)
          throw new Error('SECRET_TOKEN must contain at least 32 characters');
        return {
          secret,
          signOptions: {
            expiresIn: '12h',
            algorithm: 'HS256',
            issuer: 'insu-api',
            audience: 'insu-web',
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'insu-api',
            audience: 'insu-web',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

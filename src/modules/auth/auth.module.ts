import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';
import { TokenService } from './token.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JWT_EXPIRATION, JWT_SECRET } from 'src/config/env.tokens';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,

      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get(JWT_SECRET),
          signOptions: {
            expiresIn: configService.get(JWT_EXPIRATION) || '30d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, HashingService, JwtStrategy],
})
export class AuthModule {}

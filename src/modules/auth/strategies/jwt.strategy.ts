import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../auth.types';
import { JWT_SECRET } from 'src/config/env.tokens';
import { ConfigService } from '@nestjs/config';

export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get(JWT_SECRET),
    });
  }

  validate(payload: TokenPayload) {
    return payload;
  }
}

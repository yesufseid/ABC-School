import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './auth.types';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(payload: TokenPayload) {
    return await this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string) {
    return await this.jwtService.verifyAsync<TokenPayload>(token);
  }
}

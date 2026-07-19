import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SALT_ROUNDS } from 'src/config/env.tokens';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  private saltRounds = 10;

  constructor(configService: ConfigService) {
    this.saltRounds =
      parseInt(configService.get(SALT_ROUNDS)) || this.saltRounds;
  }

  async hash(data: string) {
    return await argon2.hash(data);
  }

  async compare(hash: string, data: string) {
    return await argon2.verify(hash, data);
  }
}

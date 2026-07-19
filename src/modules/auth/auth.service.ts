import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable, Logger } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.db.tx.user.findUnique({
      where: {
        phoneNumber: loginDto.phonNumber,
      },
    });

    return user;
  }
}

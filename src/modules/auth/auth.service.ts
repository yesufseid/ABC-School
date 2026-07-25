import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import { DatabaseService } from '../database/database.service';
import { HashingService } from './hashing.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: TransactionHost<
      TransactionalAdapterPrisma<DatabaseService>
    >,

    private readonly hashService: HashingService,
    private readonly tokenService: TokenService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.db.tx.user.findUnique({
      where: {
        phoneNumber: loginDto.phoneNumber,
      },
      select: {
        id: true,
        password: true,
        profile: {
          select: {
            name: true,
            tenantId: true,
            type: true,
            tenant: {
              select: {
                tenantSubscriptions: {
                  orderBy: { endDate: 'desc' },
                  take: 1,
                  select: {
                    endDate: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.profile) {
      throw new NotFoundException(`User not found`);
    }

    const isMatch = await this.hashService.compare(
      user.password,
      loginDto.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException(`Invalid credentails`);
    }

    const subscriptionEndDate =
      user.profile?.tenant?.tenantSubscriptions[0]?.endDate?.toISOString();

    const accessToken = await this.tokenService.generateAccessToken({
      phoneNumber: loginDto.phoneNumber,
      tenantId: user.profile.tenantId,
      type: user.profile.type,
      subscriptionEndDate,
    });

    return {
      data: {
        accessToken,
        phoneNumber: loginDto.phoneNumber,
        name: user.profile.name,
        type: user.profile.type,
        subscriptionEndDate,
      },
    };
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ClsService } from 'nestjs-cls';
import { PrismaClient } from 'prisma/src/generated/prisma/client';
import { DATABASE_URL } from 'src/config/env.tokens';
import { REQUEST_TENANT_ID } from '../auth/auth.constants';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly cls: ClsService,
    configService: ConfigService,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.get(DATABASE_URL),
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  getExtendedClient() {
    return this.$extends({
      query: {
        $allModels: {
          $allOperations: ({ model, operation, args, query }) => {
            const nonTenantSpecificModels: (typeof model)[] = [
              'Subscription',
              'User',
              'Tenant',
              'Branch',
              'Student',
              'Parent',
            ];

            if (nonTenantSpecificModels.includes(model)) {
              return query(args);
            }

            const tenantId = this.cls.get<string>(REQUEST_TENANT_ID);

            if (!tenantId) {
              return query(args);
            }

            if (
              operation === 'findMany' ||
              operation === 'findFirst' ||
              operation === 'findUnique' ||
              operation === 'update' ||
              operation === 'delete'
            ) {
              args.where = {
                ...args.where,
                tenantId,
              };
            }

            if (operation === 'create' || operation === 'update') {
              args.data = {
                ...args.data,
                tenantId,
              };
            }

            return query(args);
          },
        },
      },
    });
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [TenantController],
  providers: [
    TenantService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class TenantModule {}

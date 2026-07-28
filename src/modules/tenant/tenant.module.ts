import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TenantController, BranchController],
  providers: [TenantService, BranchService],
})
export class TenantModule {}

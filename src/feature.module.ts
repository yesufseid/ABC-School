import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { TenantModule } from './modules/tenant/tenant.module';

@Module({
  imports: [AuthModule, TenantModule, SubscriptionModule],
})
export class FeatureModule {}

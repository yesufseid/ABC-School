import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [AnalyticsModule, AuthModule, TenantModule, SubscriptionModule],
})
export class FeatureModule {}

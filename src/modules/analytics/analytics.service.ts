import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Decimal } from '@prisma/client/runtime/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDashboardStats() {
    const now = new Date();

    const [
      totalSchools,
      totalSubscriptionPlans,
      allTenantSubscriptions,
      totalActiveSubscriptions,
      subscriptionPlans,
      recentSubscriptions,
    ] = await Promise.all([
      this.databaseService.tenant.count(),

      this.databaseService.subscription.count(),

      this.databaseService.tenantSubscription.findMany({
        select: {
          paidAmount: true,
        },
      }),

      this.databaseService.tenantSubscription.count({
        where: { endDate: { gt: now } },
      }),

      this.databaseService.subscription.findMany({
        include: {
          _count: { select: { tenantSubscriptions: true } },
          tenantSubscriptions: {
            select: { paidAmount: true, endDate: true },
          },
        },
      }),

      this.databaseService.tenantSubscription.findMany({
        take: 5,
        orderBy: { startDate: 'desc' },
        include: {
          tenant: { select: { name: true } },
          subscription: { select: { name: true } },
        },
      }),
    ]);

    const totalRevenue = allTenantSubscriptions
      .reduce((acc, ts) => acc.add(ts.paidAmount), Decimal(0))
      .toNumber();

    const subscriptionsByPlan = subscriptionPlans.map((plan) => {
      const activeCount = plan.tenantSubscriptions.filter(
        (ts) => ts.endDate > now,
      ).length;
      const totalRevenue = plan.tenantSubscriptions.reduce(
        (sum, ts) => sum + ts.paidAmount.toNumber(),
        0,
      );
      return {
        subscriptionId: plan.id,
        name: plan.name,
        price: plan.price.toNumber(),
        tenantCount: plan._count.tenantSubscriptions,
        activeCount,
        totalRevenue,
      };
    });

    const formattedRecent = recentSubscriptions.map((ts) => ({
      schoolName: ts.tenant.name,
      planName: ts.subscription.name,
      startDate: ts.startDate.toISOString(),
      endDate: ts.endDate.toISOString(),
      paidAmount: ts.paidAmount.toNumber(),
    }));

    return {
      data: {
        totalSchools,
        totalSubscriptionPlans,
        totalActiveSubscriptions,
        totalRevenue,
        subscriptionsByPlan,
        recentSubscriptions: formattedRecent,
      },
    };
  }
}

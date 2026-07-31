import { Controller, Get } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { TokenPayload } from '../auth/auth.types';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardStats(@User() user: TokenPayload) {
    return this.analyticsService.getDashboardStats(user);
  }
}

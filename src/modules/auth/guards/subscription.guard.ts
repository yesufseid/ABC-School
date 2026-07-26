import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TokenPayload } from '../auth.types';
import { Reflector } from '@nestjs/core';
import { SUBSCRIPTION_IMMUNE } from '../decorators/subscription-immune.decorator';
import { IS_PUBLIC } from '../decorators/public.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector?.getAllAndOverride(IS_PUBLIC, [
      context.getClass(),
      context.getHandler(),
    ]);

    if (isPublic) return true;

    const isSubscriptionImmune = this.reflector?.getAllAndOverride(
      SUBSCRIPTION_IMMUNE,
      [context.getClass(), context.getHandler()],
    );

    if (isSubscriptionImmune) return true;

    const request = context.switchToHttp().getRequest<{ user: TokenPayload }>();

    if (!request.user.tenantId && request.user.type === 'Admin') return true;

    const subscriptionEndDateString = request.user.subscriptionEndDate;

    if (!subscriptionEndDateString)
      throw new ForbiddenException(`No Subscription Date`);

    const subscriptionEndDate = new Date(subscriptionEndDateString);

    if (Number.isNaN(subscriptionEndDate.getTime()))
      throw new ForbiddenException(`Invalid Subscription Date`);

    if (subscriptionEndDate.getTime() < new Date().getTime())
      throw new ForbiddenException(`Subscription Expired`);

    return true;
  }
}

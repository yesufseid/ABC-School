import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_IMMUNE = 'SUBSCRIPTION_IMMUNE';

export const SubscriptionImmune = () => SetMetadata(SUBSCRIPTION_IMMUNE, true);

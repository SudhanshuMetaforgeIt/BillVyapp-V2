import { SetMetadata } from '@nestjs/common';

/** Skip SubscriptionActiveGuard for routes franchise users must hit while gated. */
export const SKIP_SUBSCRIPTION_KEY = 'skipSubscription';
export const SkipSubscription = () => SetMetadata(SKIP_SUBSCRIPTION_KEY, true);

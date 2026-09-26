import { Suspense } from 'react';

import { BookingView } from '@/features/customer-dashboard';

export default function CustomerBookingPage() {
  return (
    <Suspense>
      <BookingView />
    </Suspense>
  );
}

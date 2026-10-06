import { Suspense } from 'react';

import { BookingView } from '@/features/customer-dashboard/components/booking-view';

export default function CustomerBookingPage() {
  return (
    <Suspense>
      <BookingView />
    </Suspense>
  );
}

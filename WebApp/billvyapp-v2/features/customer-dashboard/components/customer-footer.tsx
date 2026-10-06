import { PrefetchLink } from '@/components/ui/prefetch-link';
import { Scissors } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

/**
 * Static customer footer rendered on the server.
 * Completely omitted from the client component tree so zero footer JS is shipped.
 */
export function CustomerFooter() {
  const C = ROUTES.dashboard.customer;

  return (
    <footer className="mt-auto border-t border-[#EFE9DF] bg-[#FAF5ED] py-8 text-xs text-[#7D766C]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF7B00] text-white">
            <Scissors className="size-3.5" />
          </div>
          <span className="font-bold text-[#1C1C1E]">BillVy App</span>
        </div>
        <div className="flex items-center gap-6">
          <PrefetchLink href={C.salons} className="transition-colors hover:text-[#FF7B00]">
            Salons
          </PrefetchLink>
          <PrefetchLink href={C.myBookings} className="transition-colors hover:text-[#FF7B00]">
            My Bookings
          </PrefetchLink>
          <PrefetchLink href={C.bills} className="transition-colors hover:text-[#FF7B00]">
            Bills
          </PrefetchLink>
          <PrefetchLink href={C.profile} className="transition-colors hover:text-[#FF7B00]">
            Profile
          </PrefetchLink>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Ignore speculative prefetches; never cover or disable the page while fetching. */
export function QueryActivity() {
  const fetching = useIsFetching({ predicate: query => query.getObserversCount() > 0 }) > 0;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(fetching), fetching ? 180 : 250);
    return () => window.clearTimeout(timer);
  }, [fetching]);

  return (
    <span className={cn('pointer-events-none inline-flex size-5 shrink-0 items-center justify-center text-champagne transition-opacity duration-200 motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}>
      <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
      <span className="sr-only" role="status">{visible ? 'Updating data' : ''}</span>
    </span>
  );
}

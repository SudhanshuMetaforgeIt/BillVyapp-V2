'use client';

import { useState } from 'react';

/** Follow fresh DB values until edited; preserve a draft across unrelated refetches. */
export function useSettingsDraftField<T>(serverValue: T) {
  const [draft, setDraft] = useState<{ value: T } | null>(null);
  return [
    draft ? draft.value : serverValue,
    (value: T) => setDraft({ value }),
    () => setDraft(null),
  ] as const;
}

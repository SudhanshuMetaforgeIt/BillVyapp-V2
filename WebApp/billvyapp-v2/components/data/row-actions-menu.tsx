'use client';

import { Menu } from '@base-ui/react/menu';
import { MoreVertical } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Modal } from './modal';

type RowAction = { label: string; onClick: () => void; disabled?: boolean };

/** Portal menus and details outside animated, scrolling table containers. */
export function RowActionsMenu({ name, actions = [], fields }: {
  name: string;
  actions?: RowAction[];
  fields?: Array<[string, ReactNode]>;
}) {
  const [viewing, setViewing] = useState(false);
  const items = fields
    ? [{ label: 'View details', onClick: () => setViewing(true) }, ...actions]
    : actions;

  return <>
    <Menu.Root>
      <Menu.Trigger type="button" aria-label={`More actions for ${name}`}
        className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne">
        <MoreVertical className="size-4" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-[300]">
          <Menu.Popup aria-label={`Actions for ${name}`} className="min-w-44 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-surface p-1 shadow-lg outline-none">
            {items.map((action) => <Menu.Item key={action.label} disabled={action.disabled}
              onClick={action.onClick}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-text outline-none data-highlighted:bg-champagne-light data-disabled:opacity-50">
              {action.label}
            </Menu.Item>)}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
    {fields && <Modal open={viewing} onClose={() => setViewing(false)} title={name}>
      <dl className="space-y-3">{fields.map(([label, value]) => <div key={label}>
        <dt className="text-xs text-text-secondary">{label}</dt>
        <dd className="whitespace-pre-wrap break-words text-sm text-text">{value ?? '—'}</dd>
      </div>)}</dl>
    </Modal>}
  </>;
}

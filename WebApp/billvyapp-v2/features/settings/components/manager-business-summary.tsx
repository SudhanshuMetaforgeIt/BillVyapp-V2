'use client';

type ManagerBusinessSummaryProps = {
  businessName: string;
  location: string;
  memberSince: string;
  version: string;
};

export function ManagerBusinessSummary({
  businessName,
  location,
  memberSince,
  version,
}: ManagerBusinessSummaryProps) {
  const rows = [
    { label: 'Business Name', value: businessName || '—' },
    { label: 'Business Type', value: 'Salon' },
    { label: 'Currency', value: 'INR (₹)' },
    { label: 'Location', value: location || '—' },
    { label: 'Member Since', value: memberSince || '—' },
    { label: 'Version', value: version },
  ];

  return (
    <div className="app-surface-card p-5" data-dash-animate="section">
      <h3 className="mb-4 text-base font-semibold text-text">Business Summary</h3>
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <dt className="text-text-secondary">{row.label}</dt>
            <dd className="text-right font-medium text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

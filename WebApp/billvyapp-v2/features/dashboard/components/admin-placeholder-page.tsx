type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function AdminPlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="app-surface-card mx-auto max-w-2xl p-8">
      <p className="text-sm font-medium text-champagne">Coming soon</p>
      <h2 className="mt-2 text-2xl font-bold text-text">{title}</h2>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

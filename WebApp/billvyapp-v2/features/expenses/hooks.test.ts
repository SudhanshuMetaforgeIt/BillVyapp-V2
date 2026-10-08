import { describe, expect, it, vi } from 'vitest';
import { useExpenseMutation } from './hooks';
const captured = vi.hoisted(() => ({
  success: undefined as (() => Promise<void>) | undefined,
  invalidateQueries: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: captured.invalidateQueries }),
  useMutation: (options: { onSuccess: () => Promise<void> }) => {
    captured.success = options.onSuccess;
    return {};
  },
}));
vi.mock('@/hooks/use-scoped-query', () => ({ useScopedQuery: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('Expense save completion', () => {
  it('refreshes records, totals and categories before closing the dialog', async () => {
    let finish: () => void = () => {};
    captured.invalidateQueries.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const onSaved = vi.fn();
    useExpenseMutation(async () => {}, onSaved, 'Saved');
    const saved = captured.success!();
    expect(onSaved).not.toHaveBeenCalled();
    const { predicate } = captured.invalidateQueries.mock.calls[0][0] as { predicate: (query: { queryKey: string[] }) => boolean };
    for (const section of ['list', 'summary', 'categories']) expect(predicate({ queryKey: ['expenses', section] })).toBe(true);
    expect(predicate({ queryKey: ['services'] })).toBe(false);
    finish();
    await saved;
    expect(onSaved).toHaveBeenCalledOnce();
  });
});

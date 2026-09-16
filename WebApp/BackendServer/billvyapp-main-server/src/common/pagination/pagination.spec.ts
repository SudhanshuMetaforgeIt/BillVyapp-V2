import { normalizePagination, paginated } from './pagination';

describe('pagination', () => {
  it('defaults to page 1 and limit 20', () => {
    expect(normalizePagination()).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('caps limit at 100', () => {
    expect(normalizePagination(2, 500)).toEqual({
      page: 2,
      limit: 100,
      skip: 100,
    });
  });

  it('builds metadata', () => {
    expect(paginated(['a'], 21, 1, 20).meta).toEqual({
      page: 1,
      limit: 20,
      total: 21,
      totalPages: 2,
    });
  });
});

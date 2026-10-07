import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { normalizePagination, paginated } from './pagination';
import { PaginationQueryDto } from './pagination-query.dto';
import { ListFranchiseSubscriptionsQueryDto } from '../../franchise-subscriptions/dto/franchise-subscription.dto';

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

  it('handles negative or invalid inputs gracefully', () => {
    expect(normalizePagination(-1, -10)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
    expect(normalizePagination(NaN as unknown as number, 0)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
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

  describe('PaginationQueryDto validation', () => {
    it('validates valid pagination dto', async () => {
      const dto = plainToInstance(PaginationQueryDto, { page: 2, limit: 50 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('rejects limit exceeding 100', async () => {
      const dto = plainToInstance(PaginationQueryDto, { page: 1, limit: 101 });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('rejects limit less than 1', async () => {
      const dto = plainToInstance(PaginationQueryDto, { page: 1, limit: 0 });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('rejects page less than 1', async () => {
      const dto = plainToInstance(PaginationQueryDto, { page: 0, limit: 20 });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('enforces pagination bounds on ListFranchiseSubscriptionsQueryDto', async () => {
      const dto = plainToInstance(ListFranchiseSubscriptionsQueryDto, {
        limit: 500,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });
  });
});


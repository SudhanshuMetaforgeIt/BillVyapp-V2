import { normalizePhone, normalizeFranchisePhone } from './phone';
describe('International phone storage', () => {
  it('uses independent India and US defaults', () => {
    expect(normalizePhone('9876543210', 'IN')).toBe('+919876543210');
    expect(normalizePhone('2125550123', 'US')).toBe('+12125550123');
  });
  it('never relabels stored international numbers after the default changes', () =>
    expect(normalizePhone('+919876543210', 'US')).toBe('+919876543210'));
  it('normalizes formatting without losing digits', () =>
    expect(normalizePhone('(212) 555-0123', 'US')).toBe('+12125550123'));
  it.each(['123', '12345678901', 'abc2125550123', '+1212', '++12125550123'])(
    'rejects invalid input %s',
    (value) => expect(() => normalizePhone(value, 'US')).toThrow(),
  );
  it('resolves the selected franchise for writes', async () => {
    const prisma = {
      franchise: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ preferences: { phoneCountry: 'US' } }),
      },
      salon: { findUnique: jest.fn() },
    };
    expect(
      await normalizeFranchisePhone(prisma as never, '2125550123', 'us'),
    ).toBe('+12125550123');
    expect(prisma.franchise.findUnique).toHaveBeenCalledWith({
      where: { id: 'us' },
      select: { preferences: true },
    });
  });
  it('uses a salon parent franchise when no franchise id is available', async () => {
    const prisma = {
      franchise: { findUnique: jest.fn() },
      salon: {
        findUnique: jest.fn().mockResolvedValue({
          franchise: { preferences: { phoneCountry: 'US' } },
        }),
      },
    };
    expect(
      await normalizeFranchisePhone(
        prisma as never,
        '2125550123',
        null,
        'salon',
      ),
    ).toBe('+12125550123');
  });
  it('avoids a franchise query for an already canonical number', async () => {
    const prisma = {
      franchise: { findUnique: jest.fn() },
      salon: { findUnique: jest.fn() },
    };
    expect(
      await normalizeFranchisePhone(prisma as never, '+12125550123', 'us'),
    ).toBe('+12125550123');
    expect(prisma.franchise.findUnique).not.toHaveBeenCalled();
  });
});

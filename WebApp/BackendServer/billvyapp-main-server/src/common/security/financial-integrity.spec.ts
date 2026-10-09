import {
  moneyCents,
  centsString,
  lineTaxCents,
  financialRequestHash,
  assertSameFinancialRequest,
  requireRequestKey,
  requireCurrency,
  MAX_MONEY,
  assertNoRawCardData,
} from './financial-integrity';

describe('Financial integrity primitives', () => {
  it.each([NaN, Infinity, -1, 0.001, MAX_MONEY + 1])(
    'rejects invalid amount %s',
    (amount) => {
      expect(() => moneyCents(amount, 'amount')).toThrow();
    },
  );
  it('keeps decimal sums exact in cents', () => {
    expect(centsString(moneyCents('0.10', 'a') + moneyCents('0.20', 'b'))).toBe(
      '0.30',
    );
    expect(centsString(moneyCents(MAX_MONEY, 'maximum'))).toBe('9999999999.99');
  });
  it('rounds line tax half up with integer arithmetic', () => {
    expect(lineTaxCents(1, 50)).toBe(1);
    expect(lineTaxCents(79900, 18)).toBe(14382);
    expect(() => lineTaxCents(100, 101)).toThrow();
  });
  it('binds a retry to the complete request while ignoring object property order', () => {
    const original = financialRequestHash({
      amount: 1,
      bill: 'a',
      lines: [{ quantity: 2, id: 's' }],
    });
    expect(
      financialRequestHash({
        bill: 'a',
        lines: [{ id: 's', quantity: 2 }],
        amount: 1,
      }),
    ).toBe(original);
    expect(() =>
      assertSameFinancialRequest(
        original,
        financialRequestHash({ amount: 2, bill: 'a' }),
      ),
    ).toThrow('different financial request');
  });
  it('requires a usable stable request identity', () => {
    expect(() => requireRequestKey()).toThrow();
    expect(() => requireRequestKey('short')).toThrow();
    expect(requireRequestKey('request-123')).toBe('request-123');
  });
  it('accepts only supported currency', () => {
    expect(requireCurrency('USD')).toBe('USD');
    expect(() => requireCurrency('BTC')).toThrow();
  });
  it('rejects card credentials in payment notes or card references', () => {
    expect(() => assertNoRawCardData('CVV: 123')).toThrow();
    expect(() =>
      assertNoRawCardData('Card number: 4111 1111 1111 1111'),
    ).toThrow();
    expect(() => assertNoRawCardData(null, '4111111111111111', true)).toThrow();
    expect(() =>
      assertNoRawCardData('Terminal receipt received', 'TERMINAL-ABC', true),
    ).not.toThrow();
  });
});

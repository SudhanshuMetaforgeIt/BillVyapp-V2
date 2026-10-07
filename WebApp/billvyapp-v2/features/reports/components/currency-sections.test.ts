import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CurrencySections, SummaryCards } from './report-analytics-widgets';
import type { ReportAnalytics } from '../types/reports.types';

function group(currency: string, amount: string): ReportAnalytics {
  return {
    scope: {
      currency,
      dateFrom: '2026-10-01',
      dateTo: '2026-10-05',
      franchiseId: null,
      franchiseName: null,
      salonId: null,
      salonName: null,
      timeZone: 'UTC',
    },
    summary: {
      totalRevenue: amount,
      successfulPayments: 1,
      totalPayments: 1,
      failedPayments: 0,
      userCount: 0,
      customerCount: 0,
      franchiseCount: 1,
      salonCount: 1,
      paymentSuccessRate: 100,
      averageTransactionValue: Number(amount),
    },
  };
}
describe('Separate currency report display', () => {
  it('renders each summary in its own currency without adding unlike amounts', () => {
    const data: ReportAnalytics = {
      scope: group('INR', '1500').scope,
      currencyGroups: [group('INR', '1500'), group('USD', '25')],
    };
    const props = {
      data,
      children: (g: ReportAnalytics) =>
        createElement(SummaryCards, {
          metrics: g.summary!,
          range: 'Selected period',
        }),
    };
    const html = renderToStaticMarkup(createElement(CurrencySections, props));
    expect(html).toContain('INR — Indian rupees');
    expect(html).toContain('USD — US dollars');
    expect(html).toContain('₹1,500.00');
    expect(html).toContain('$25.00');
    expect(html).not.toContain('1,525');
    expect(html).not.toContain('₹25.00');
  });
  it('retains the selected franchise currency for a single-currency report', () => {
    const props = {
      data: group('USD', '25'),
      children: (g: ReportAnalytics) =>
        createElement(SummaryCards, {
          metrics: g.summary!,
          range: 'Selected period',
        }),
    };
    const html = renderToStaticMarkup(createElement(CurrencySections, props));
    expect(html).toContain('$25.00');
    expect(html).not.toContain('INR —');
  });
});

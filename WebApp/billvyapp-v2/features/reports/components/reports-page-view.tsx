'use client';
import { DeferredContent } from '@/components/ui/deferred-content';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { SelectInput } from '@/components/data/form-fields';
import { defaultReportsDateRange } from '../services/reports.service';
import {
  useReports,
  useReportAnalytics,
  useReportFilterOptions,
} from '../hooks/use-reports';
import type {
  AnalyticsParams,
  ReportListRow,
  ReportTypeFilter,
} from '../types/reports.types';
import {
  AnalyticsState,
  AnalyticsTable,
  ReportSection,
  SummaryCards,
} from './report-analytics-widgets';
import { ReportsFilters } from './reports-filters';
import { ReportsTable } from './reports-table';
import { REPORT_TYPES } from '../types/report-options';

const GenerateReportDialog = dynamic(() =>
  import('./report-dialogs').then((module) => module.GenerateReportDialog),
);
const ReportPreview = dynamic(() =>
  import('./report-dialogs').then((module) => module.ReportPreview),
);
const money = (key: string, label: string) => ({ key, label, money: true });
export function ReportsPageView() {
  const [params, setParams] = useState<AnalyticsParams>(() => ({
    ...defaultReportsDateRange(),
    franchiseId: 'all',
    salonId: 'all',
    interval: 'month',
    salonSort: 'revenue',
    serviceSort: 'revenue',
  }));
  const [preset, setPreset] = useState('This Month'),
    [page, setPage] = useState(1),
    [reportType, setReportType] = useState<ReportTypeFilter>('all');
  const [generateOpen, setGenerateOpen] = useState(false),
    [preview, setPreview] = useState<ReportListRow | null>(null);
  const options = useReportFilterOptions('all');
  const summary = useReportAnalytics(params, 'summary'),
    revenue = useReportAnalytics(params, 'revenue'),
    business = useReportAnalytics(params, 'business'),
    insights = useReportAnalytics(params, 'insights'),
    details = useReportAnalytics(params, 'details');
  const reports = useReports({ ...params, page, limit: 7, reportType });
  const change = (next: AnalyticsParams) => {
    setParams(next);
    setPage(1);
  };
  const range = `${params.dateFrom} – ${params.dateTo}`;
  return (
    <div className="space-y-8">
      <ReportsFilters
        params={params}
        onChange={change}
        preset={preset}
        onPreset={setPreset}
        options={options.data}
        loading={options.isLoading}
        error={options.isError}
        retry={() => void options.refetch()}
        onGenerate={() => setGenerateOpen(true)}
      />
      <ReportSection
        title="Executive Summary"
        description={`Selected range: ${range}. Payment metrics use payment dates; population counts show records created by the range end.`}
      >
        <AnalyticsState
          loading={summary.isLoading}
          error={summary.isError}
          retry={() => void summary.refetch()}
        >
          {summary.data?.summary && (
            <SummaryCards metrics={summary.data.summary} range={range} />
          )}
        </AnalyticsState>
      </ReportSection>
      <ReportSection
        title="Revenue & Payments"
        description="Revenue is the sum of successful payments. Split payments count individually; refunded, pending and cancelled payments are excluded from revenue."
      >
        <div className="max-w-xs">
          <SelectInput
            aria-label="Revenue interval"
            value={params.interval}
            onChange={(e) =>
              change({
                ...params,
                interval: e.target.value as AnalyticsParams['interval'],
              })
            }
          >
            {['day', 'week', 'month', 'year'].map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </SelectInput>
        </div>
        <AnalyticsState
          loading={revenue.isLoading}
          error={revenue.isError}
          retry={() => void revenue.refetch()}
        >
          {revenue.data?.revenue && (
            <div className="space-y-4">
              <RevenueTrend data={revenue.data.revenue.series} />
              <div className="grid gap-4 content-lg:grid-cols-2">
                <RevenueBars
                  title="Revenue by payment method"
                  data={revenue.data.revenue.methods}
                  limit={revenue.data.revenue.methods.length}
                  label="method"
                />
                <AnalyticsTable
                  title="Payment Performance"
                  data={revenue.data.revenue.statuses}
                  columns={[
                    { key: 'status', label: 'Status' },
                    { key: 'attempts', label: 'Payment attempts' },
                  ]}
                />
              </div>
              <AnalyticsTable
                title="Payment methods"
                data={revenue.data.revenue.methods}
                columns={[
                  { key: 'method', label: 'Method' },
                  { key: 'attempts', label: 'Attempts' },
                  { key: 'successful', label: 'Successful' },
                  money('revenue', 'Successful revenue'),
                ]}
              />
            </div>
          )}
        </AnalyticsState>
      </ReportSection>
      <ReportSection
        title="Business Performance"
        description="Top 50 results. Revenue and transactions reflect successful payments; average bill and services sold use completed bills in the selected calendar range."
      >
        <div className="max-w-xs">
          <SelectInput
            aria-label="Sort salons"
            value={params.salonSort}
            onChange={(e) =>
              change({
                ...params,
                salonSort: e.target.value as AnalyticsParams['salonSort'],
              })
            }
          >
            <option value="revenue">Revenue</option>
            <option value="transactions">Transactions</option>
            <option value="customers">Customers</option>
            <option value="averageBill">Average bill</option>
          </SelectInput>
        </div>
        <AnalyticsState
          loading={business.isLoading}
          error={business.isError}
          retry={() => void business.refetch()}
        >
          {business.data?.business && (
            <div className="space-y-4">
              <RevenueBars
                title="Top franchise revenue"
                data={business.data.business.franchises}
                label="name"
              />
              <AnalyticsTable
                title="Top Franchises by Revenue"
                data={business.data.business.franchises.map((r, i) => ({
                  ...r,
                  rank: i + 1,
                }))}
                columns={[
                  { key: 'rank', label: 'Rank' },
                  { key: 'name', label: 'Franchise' },
                  { key: 'salons', label: 'Salons' },
                  { key: 'transactions', label: 'Transactions' },
                  money('revenue', 'Revenue'),
                  money('averageTransaction', 'Average transaction'),
                ]}
              />
              <AnalyticsTable
                title="Salon Performance"
                data={business.data.business.salons}
                columns={[
                  { key: 'name', label: 'Salon' },
                  { key: 'franchise', label: 'Franchise' },
                  { key: 'transactions', label: 'Transactions' },
                  money('revenue', 'Revenue'),
                  { key: 'customers', label: 'Customers served' },
                  money('averageBill', 'Average bill'),
                  { key: 'memberships', label: 'New memberships' },
                  { key: 'servicesSold', label: 'Service units' },
                ]}
              />
            </div>
          )}
        </AnalyticsState>
      </ReportSection>
      <ReportSection
        title="Customer/User Insights"
        description="Customer spend uses completed bill totals, including tax. Returning customers have a completed bill before the selected range within the same scope. User counts are populations at range end."
      >
        <AnalyticsState
          loading={insights.isLoading}
          error={insights.isError}
          retry={() => void insights.refetch()}
        >
          {insights.data?.insights && (
            <div className="space-y-4">
              <AnalyticsTable
                title="Customer Insights"
                data={insights.data.insights.customers.filter(
                  (r) =>
                    Number(r.customersServed) > 0 || Number(r.newCustomers) > 0,
                )}
                columns={[
                  { key: 'customersServed', label: 'Customers served' },
                  { key: 'newCustomers', label: 'New customers' },
                  { key: 'returningCustomers', label: 'Returning customers' },
                  money('billedRevenue', 'Customer billed revenue'),
                  money('averageCustomerSpend', 'Average customer spend'),
                ]}
              />
              <div className="grid gap-4 content-lg:grid-cols-3">
                <AnalyticsTable
                  title="Users by role"
                  data={insights.data.insights.roles}
                  columns={[
                    { key: 'role', label: 'Role' },
                    { key: 'users', label: 'Users' },
                  ]}
                />
                <AnalyticsTable
                  title="Users by franchise (top 50)"
                  data={insights.data.insights.userFranchises}
                  columns={[
                    { key: 'franchise', label: 'Franchise' },
                    { key: 'users', label: 'Users' },
                  ]}
                />
                <AnalyticsTable
                  title="Users by salon (top 50)"
                  data={insights.data.insights.userSalons}
                  columns={[
                    { key: 'salon', label: 'Salon' },
                    { key: 'users', label: 'Users' },
                  ]}
                />
              </div>
            </div>
          )}
        </AnalyticsState>
      </ReportSection>
      <ReportSection
        title="Generated Reports"
        description="Persisted snapshots retain their original date range. This history is filtered by franchise, salon and report type; it is not filtered by the date the file was generated."
      >
        <div className="max-w-xs">
          <SelectInput
            aria-label="Filter by report type"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as ReportTypeFilter);
              setPage(1);
            }}
          >
            <option value="all">All Report Types</option>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
            <option value="activity">Activity (legacy)</option>
          </SelectInput>
        </div>
        <ReportsTable
          rows={reports.data?.rows ?? []}
          meta={
            reports.data?.meta ?? { page: 1, limit: 7, total: 0, totalPages: 0 }
          }
          isLoading={reports.isLoading}
          isError={reports.isError}
          onRetry={() => void reports.refetch()}
          onPageChange={setPage}
          onView={setPreview}
        />
      </ReportSection>
      <ReportSection
        title="Detailed Analytics"
        description="Membership revenue is fees recorded on completed bills, not inferred plan prices. Active membership validity uses range-end dates and current status; historical status changes are not reconstructed. Redemptions come from benefit records on completed bills."
      >
        <AnalyticsState
          loading={details.isLoading}
          error={details.isError}
          retry={() => void details.refetch()}
        >
          {details.data?.details && (
            <div className="space-y-4">
              <AnalyticsTable
                title="Membership Performance"
                data={details.data.details.memberships.filter(
                  (r) =>
                    Number(r.members) > 0 ||
                    Number(r.redemptions) > 0 ||
                    Number(r.membershipRevenue) > 0,
                )}
                columns={[
                  { key: 'activeMemberships', label: 'Active memberships' },
                  { key: 'newMemberships', label: 'New memberships' },
                  { key: 'expiredMemberships', label: 'Expired in range' },
                  money('membershipRevenue', 'Billed membership fees'),
                  { key: 'redemptions', label: 'Redemption lines' },
                  { key: 'benefitVisits', label: 'Benefit visits' },
                  { key: 'benefitUnits', label: 'Benefit units' },
                  money('benefitSavings', 'Benefit savings'),
                ]}
              />
              <AnalyticsTable
                title="Top Membership Plans (top 50)"
                data={details.data.details.plans}
                columns={[
                  { key: 'name', label: 'Plan' },
                  { key: 'salon', label: 'Salon' },
                  { key: 'members', label: 'Members' },
                  money('revenue', 'Billed fees'),
                  { key: 'activeMembers', label: 'Active members' },
                  { key: 'redemptions', label: 'Redemptions' },
                ]}
              />
              <div className="max-w-xs">
                <SelectInput
                  aria-label="Sort services"
                  value={params.serviceSort}
                  onChange={(e) =>
                    change({
                      ...params,
                      serviceSort: e.target
                        .value as AnalyticsParams['serviceSort'],
                    })
                  }
                >
                  <option value="revenue">Revenue</option>
                  <option value="quantity">Quantity</option>
                  <option value="transactions">Transactions</option>
                </SelectInput>
              </div>
              <RevenueBars
                title="Service revenue for current ranking"
                data={[...details.data.details.services].sort(
                  (a, b) => Number(b.revenue) - Number(a.revenue),
                )}
                label="name"
              />
              <AnalyticsTable
                title="Top Services (top 50)"
                data={details.data.details.services}
                columns={[
                  { key: 'name', label: 'Service' },
                  { key: 'salon', label: 'Salon' },
                  { key: 'transactions', label: 'Bills' },
                  { key: 'quantity', label: 'Quantity' },
                  money('revenue', 'Billed line total'),
                  money('averagePrice', 'Average unit total'),
                ]}
              />
            </div>
          )}
        </AnalyticsState>
      </ReportSection>
      {generateOpen && (
        <GenerateReportDialog
          params={params}
          options={options.data}
          apply={(next) => {
            change(next);
            setPreset('Custom Range');
          }}
          close={() => setGenerateOpen(false)}
        />
      )}
      {preview && (
        <ReportPreview report={preview} close={() => setPreview(null)} />
      )}
    </div>
  );
}

const LazyRevenueTrend = dynamic(() => import('./report-charts').then((module) => module.RevenueTrend), { loading: () => <div role="status" aria-label="Loading chart" className="h-[400px] animate-pulse rounded-2xl border border-border bg-surface" /> });
function RevenueTrend(props: import('react').ComponentProps<typeof import('./report-charts').RevenueTrend>) {
  return <DeferredContent><LazyRevenueTrend {...props} /></DeferredContent>;
}

const LazyRevenueBars = dynamic(() => import('./report-charts').then((module) => module.RevenueBars), { loading: () => <div role="status" aria-label="Loading chart" className="h-[400px] animate-pulse rounded-2xl border border-border bg-surface" /> });
function RevenueBars(props: import('react').ComponentProps<typeof import('./report-charts').RevenueBars>) {
  return <DeferredContent><LazyRevenueBars {...props} /></DeferredContent>;
}

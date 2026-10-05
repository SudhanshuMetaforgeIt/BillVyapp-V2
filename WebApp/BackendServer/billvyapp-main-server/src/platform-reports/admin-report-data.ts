export type ReportBill = {
  id: string;
  billNumber: string;
  date: string;
  branchId: string;
  branch: string;
  customerId: string;
  customer: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  collected: number;
  status: string;
  paymentStatus: string;
  paymentMethods: string;
};
export type ReportService = {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
};
export type AdminReportSnapshot = {
  kind: 'FRANCHISE_OVERVIEW';
  status: 'Generating' | 'Ready' | 'Failed';
  dateFrom: string;
  dateTo: string;
  branchId: string | null;
  branch: string;
  timeZone: string;
  interval: 'day' | 'week' | 'month';
  generatedOn: string;
  generatedBy: string;
  stats: {
    totalRevenue: number;
    totalBills: number;
    totalCustomers: number;
    totalServices: number;
    totalStaff: number;
  };
  bills: ReportBill[];
  revenueSeries: {
    date: string;
    revenue: number;
    bills: number;
    averageBillValue: number;
  }[];
  branchComparison: {
    id: string;
    name: string;
    revenue: number;
    bills: number;
    customers: number;
    averageBillValue: number;
    growth: string;
    positive: boolean;
  }[];
  customers: {
    id: string;
    name: string;
    bills: number;
    revenue: number;
    averageBillValue: number;
    lastVisit: string;
  }[];
  services: ReportService[];
  billsOverview: {
    total: number;
    paid: number;
    paidPct: number;
    pending: number;
    pendingPct: number;
    overdue: number;
    overduePct: number;
    cancelled: number;
    cancelledPct: number;
  };
  payments: {
    successful: number;
    failed: number;
    attempts: number;
    successRate: number | null;
    methods: { name: string; revenue: number; payments: number }[];
  };
  branches: { id: string; name: string }[];
};

export function aggregateAdminBills(
  bills: ReportBill[],
  branches: { id: string; name: string }[],
  interval: 'day' | 'week' | 'month',
) {
  const completed = bills.filter((b) => b.status === 'COMPLETED');
  const metrics = (rows: ReportBill[]) => ({
    revenue:
      rows.reduce((sum, b) => sum + Math.round(b.collected * 100), 0) / 100,
    bills: rows.length,
    customers: new Set(rows.map((b) => b.customerId)).size,
    averageBillValue: rows.length
      ? rows.reduce((sum, b) => sum + b.total, 0) / rows.length
      : 0,
  });
  const groups = new Map<string, ReportBill[]>();
  for (const bill of completed) {
    let date = bill.date;
    if (interval === 'month') date = `${date.slice(0, 7)}-01`;
    if (interval === 'week') {
      const day = new Date(`${date}T00:00:00Z`);
      day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
      date = day.toISOString().slice(0, 10);
    }
    const group = groups.get(date) ?? [];
    group.push(bill);
    groups.set(date, group);
  }
  const revenueSeries = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({ date, ...metrics(rows) }));
  const branchGroups = new Map<string, ReportBill[]>();
  const customerGroups = new Map<string, ReportBill[]>();
  for (const bill of completed) {
    const branchRows = branchGroups.get(bill.branchId) ?? [];
    branchRows.push(bill);
    branchGroups.set(bill.branchId, branchRows);
    const customerRows = customerGroups.get(bill.customerId) ?? [];
    customerRows.push(bill);
    customerGroups.set(bill.customerId, customerRows);
  }
  const branchComparison = branches
    .map((b) => ({
      ...b,
      ...metrics(branchGroups.get(b.id) ?? []),
      growth: '—',
      positive: false,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  const customers = [...customerGroups]
    .map(([id, rows]) => {
      return {
        id,
        name: rows[0].customer,
        ...metrics(rows),
        lastVisit: rows
          .map((b) => b.date)
          .sort()
          .at(-1)!,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const pct = (n: number) =>
    bills.length ? Number(((n / bills.length) * 100).toFixed(1)) : 0;
  const paid = bills.filter(
    (b) => b.status !== 'CANCELLED' && b.paymentStatus === 'PAID',
  ).length;
  const pending = bills.filter(
    (b) => b.status !== 'CANCELLED' && b.paymentStatus === 'PARTIAL',
  ).length;
  const overdue = completed.filter((b) => b.paymentStatus === 'UNPAID').length;
  const cancelled = bills.filter((b) => b.status === 'CANCELLED').length;
  return {
    revenueSeries,
    branchComparison,
    customers,
    totalRevenue: metrics(completed).revenue,
    billsOverview: {
      total: bills.length,
      paid,
      paidPct: pct(paid),
      pending,
      pendingPct: pct(pending),
      overdue,
      overduePct: pct(overdue),
      cancelled,
      cancelledPct: pct(cancelled),
    },
  };
}

import type { Prisma } from '../generated/prisma/client';

export function escapeMail(value: string | number | null | undefined): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}

export const MAIL_BILL_INCLUDE = {
  salon: { select: { name: true, addressLine1: true, addressLine2: true } },
  customer: {
    select: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
  items: { orderBy: { linePosition: 'asc' as const } },
  payments: { orderBy: { paymentDate: 'asc' as const } },
  appliedMembership: { select: { couponCode: true } },
} satisfies Prisma.BillInclude;

export function billEmail(
  bill: Prisma.BillGetPayload<{ include: typeof MAIL_BILL_INCLUDE }>,
) {
  const money = (value: unknown) =>
    escapeMail(
      new Intl.NumberFormat(bill.currency === 'USD' ? 'en-US' : 'en-IN', {
        style: 'currency',
        currency: bill.currency,
      }).format(Number(value)),
    );
  const row = (label: string, value: unknown) =>
    `<tr><td>${escapeMail(label)}</td><td style="text-align:right">${money(value)}</td></tr>`;
  const loyalty = bill.payments
    .filter((p) => p.status === 'SUCCESS' && p.provider === 'LOYALTY')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const membership = bill.items.reduce(
    (sum, i) => sum + Number(i.membershipDiscount),
    0,
  );
  const lineDiscounts = bill.items.reduce(
    (sum, i) => sum + Number(i.discount),
    0,
  );
  const normal = bill.items.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0,
  );
  const name = [bill.customer.user.firstName, bill.customer.user.lastName]
    .filter(Boolean)
    .join(' ');
  return {
    recipient: bill.customer.user.email,
    subject: `Bill ${bill.billNumber} — ${bill.paymentStatus}`.slice(0, 255),
    html: `<html><body style="font-family:Arial,sans-serif;color:#222"><h2>${escapeMail(bill.salon.name)}</h2><p>${escapeMail([bill.salon.addressLine1, bill.salon.addressLine2].filter(Boolean).join(', '))}</p><h3>Bill ${escapeMail(bill.billNumber)}</h3><p>${escapeMail(name)} · ${escapeMail(bill.billDate.toISOString().slice(0, 10))}</p><p>Bill status: ${escapeMail(bill.status)} · Payment status: ${escapeMail(bill.paymentStatus)}</p><table cellpadding="8" style="border-collapse:collapse;width:100%"><thead><tr><th align="left">Item</th><th>Qty</th><th>Rate</th><th>Membership discount</th><th>Other discount</th><th>Tax</th><th>Total</th></tr></thead><tbody>${bill.items.map((i) => `<tr><td>${escapeMail(i.description || i.itemType)}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${money(i.membershipDiscount)}</td><td>${money(i.discount)}</td><td>${money(i.taxAmount)}</td><td>${money(i.total)}</td></tr>`).join('')}</tbody></table>${bill.appliedMembership ? `<p>Membership coupon: ${escapeMail(bill.appliedMembership.couponCode)}</p>` : ''}<table cellpadding="6" style="width:100%">${row('Normal service/product amount', normal)}${row('Membership discount', -membership)}${row('Item discounts', -lineDiscounts)}${row('Subtotal', bill.subtotal)}${row('Bill discount', -Number(bill.discount))}${row('Membership enrollment fee', bill.membershipFee)}${row('Tax', bill.tax)}${row('Round off', bill.roundOff)}${row('Bill total', bill.total)}${row(`Loyalty points used (${loyalty})`, -loyalty)}${row('Amount after loyalty', Number(bill.total) - loyalty)}${row('Payment received excluding loyalty', Number(bill.paidAmount) - loyalty)}${row('Due', bill.dueAmount)}</table><h4>Payments</h4>${bill.payments.map((p) => `<p>${escapeMail(p.provider === 'LOYALTY' ? 'Loyalty points' : p.paymentMethod)} · ${escapeMail(p.status)} · ${money(p.amount)} · ${escapeMail(p.paymentDate.toISOString())}</p>`).join('')}<p>Keep this email as your bill receipt. Payment status reflects confirmed records at the time this email was generated.</p></body></html>`,
  };
}

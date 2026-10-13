import { billEmail } from './bill-email';

describe('Customer bill emails', () => {
  const bill = {
    billNumber: 'BILL-1',
    billDate: new Date('2026-10-13T00:00:00Z'),
    currency: 'INR',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    salon: {
      name: 'Salon <img onerror="bad">',
      addressLine1: 'Address',
      addressLine2: null,
    },
    customer: {
      user: {
        firstName: 'Customer <script>',
        lastName: 'Name',
        email: 'customer@example.com',
      },
    },
    appliedMembership: { couponCode: 'MEMBER-1' },
    items: [
      {
        description: 'Hair wash <script>',
        itemType: 'SERVICE',
        quantity: 1,
        unitPrice: '12550',
        membershipDiscount: '2150',
        discount: '0',
        taxAmount: '0',
        total: '10400',
      },
    ],
    payments: [
      {
        status: 'SUCCESS',
        provider: 'MANUAL',
        paymentMethod: 'UPI',
        amount: '10355',
        paymentDate: new Date('2026-10-13T00:01:00Z'),
      },
      {
        status: 'SUCCESS',
        provider: 'LOYALTY',
        paymentMethod: 'WALLET',
        amount: '45',
        paymentDate: new Date('2026-10-13T00:01:00Z'),
      },
    ],
    subtotal: '10400',
    discount: '0',
    tax: '0',
    roundOff: '0',
    membershipFee: '0',
    total: '10400',
    paidAmount: '10400',
    dueAmount: '0',
  };
  it('includes authoritative membership, loyalty, real payment and due values', () => {
    const email = billEmail(bill as never);
    expect(email.recipient).toBe('customer@example.com');
    expect(email.html).toContain('Loyalty points used (45)');
    expect(email.html).toContain('₹10,355.00');
    expect(email.html).toContain('₹12,550.00');
    expect(email.html).toContain('-₹2,150.00');
    expect(email.html).toContain('MEMBER-1');
    expect(email.html).toContain('Payment status: PAID');
  });
  it('escapes all customer, shop and item text', () => {
    const email = billEmail(bill as never);
    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;script&gt;');
  });
  it('uses dollars for a USA bill and labels unpaid bills correctly', () => {
    const email = billEmail({
      ...bill,
      currency: 'USD',
      paymentStatus: 'UNPAID',
      paidAmount: '0',
      dueAmount: '10400',
      payments: [],
    } as never);
    expect(email.html).toContain('$10,400.00');
    expect(email.html).not.toContain('₹');
    expect(email.html).toContain('Payment status: UNPAID');
    expect(email.subject).toContain('UNPAID');
  });
  it('does not count ordinary wallet payments or pending points as loyalty redemption', () => {
    const email = billEmail({
      ...bill,
      payments: [
        { ...bill.payments[1], provider: 'MANUAL' },
        { ...bill.payments[1], status: 'PENDING' },
      ],
    } as never);
    expect(email.html).toContain('Loyalty points used (0)');
  });
});

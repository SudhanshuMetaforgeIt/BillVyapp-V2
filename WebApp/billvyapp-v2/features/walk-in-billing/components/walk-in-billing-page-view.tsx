'use client';

import { useMemo, useState } from 'react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { useCurrentUser } from '@/hooks/use-current-user';
import { computeBillPreview } from '../lib/bill-preview';
import { useSettleWalkInBill } from '../hooks/use-settle-walk-in-bill';
import type {
  CartLine,
  SalonService,
  WalkInCustomer,
  WalkInPaymentMethod,
} from '../types/walk-in-billing.types';
import { AddServicesSection } from './add-services-section';
import { BillSummaryCard } from './bill-summary-card';
import { CreateCustomerDialog } from './create-customer-dialog';
import { CustomerDetailsSection } from './customer-details-section';
import { PaymentMethodsCard } from './payment-methods-card';
import { RecentBillsSection } from './recent-bills-section';

function toCartLine(service: SalonService): CartLine {
  return {
    serviceId: service.id,
    name: service.name,
    quantity: 1,
    unitPrice: Number(service.price) || 0,
    taxRate: Number(service.taxRate) || 0,
  };
}

export function WalkInBillingPageView() {
  const user = useCurrentUser();
  const salonId = user?.salonId ?? null;

  const [phoneQuery, setPhoneQuery] = useState('');
  const [customer, setCustomer] = useState<WalkInCustomer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [serviceSearch, setServiceSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [stylistName, setStylistName] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<WalkInPaymentMethod>('UPI');

  const discountValue = applyDiscount
    ? Math.max(0, Number(discountAmount) || 0)
    : 0;

  const preview = useMemo(
    () => computeBillPreview(cart, discountValue),
    [cart, discountValue],
  );

  const settle = useSettleWalkInBill(() => {
    resetForm();
  });

  function resetForm() {
    setPhoneQuery('');
    setCustomer(null);
    setServiceSearch('');
    setCategoryId('');
    setCart([]);
    setStylistName('');
    setApplyDiscount(false);
    setDiscountAmount('');
    setPaymentMethod('UPI');
  }

  function addService(service: SalonService) {
    setCart((prev) => {
      const existing = prev.find((line) => line.serviceId === service.id);
      if (existing) {
        return prev.map((line) =>
          line.serviceId === service.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, toCartLine(service)];
    });
  }

  function changeQty(serviceId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.serviceId !== serviceId);
      }
      return prev.map((line) =>
        line.serviceId === serviceId ? { ...line, quantity } : line,
      );
    });
  }

  function removeLine(serviceId: string) {
    setCart((prev) => prev.filter((line) => line.serviceId !== serviceId));
  }

  const canPay =
    Boolean(salonId) &&
    Boolean(customer) &&
    cart.length > 0 &&
    preview.total > 0 &&
    !settle.isPending;

  if (!salonId) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Salon not assigned"
          message="Your manager account needs a salon before walk-in billing can be used."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,22rem)] xl:items-start xl:gap-7">
      <div className="space-y-5">
        <CustomerDetailsSection
          phoneQuery={phoneQuery}
          onPhoneQueryChange={setPhoneQuery}
          selected={customer}
          onSelect={(selected) => {
            setCustomer(selected);
            setPhoneQuery(selected.phone);
          }}
          onClear={() => {
            setCustomer(null);
            setPhoneQuery('');
          }}
          onRequestCreate={() => setCreateOpen(true)}
        />

        <AddServicesSection
          enabled={Boolean(customer)}
          search={serviceSearch}
          onSearchChange={setServiceSearch}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          cart={cart}
          onAddService={addService}
          onChangeQty={changeQty}
          onRemove={removeLine}
          stylistName={stylistName}
          onStylistNameChange={setStylistName}
          applyDiscount={applyDiscount}
          onApplyDiscountChange={setApplyDiscount}
          discountAmount={discountAmount}
          onDiscountAmountChange={setDiscountAmount}
        />

        <RecentBillsSection customer={customer} />
      </div>

      <div className="space-y-5 xl:sticky xl:top-4">
        <BillSummaryCard preview={preview} />
        <PaymentMethodsCard
          value={paymentMethod}
          onChange={setPaymentMethod}
          canPay={canPay}
          isPaying={settle.isPending}
          onReset={resetForm}
          onPay={() => {
            if (!customer || !salonId || cart.length === 0) return;
            settle.mutate({
              salonId,
              customerId: customer.id,
              discount: discountValue > 0 ? discountValue : undefined,
              notes: stylistName.trim()
                ? `Stylist: ${stylistName.trim()}`
                : null,
              items: cart.map((line) => ({
                itemType: 'SERVICE' as const,
                serviceId: line.serviceId,
                quantity: line.quantity,
              })),
              paymentMethod,
            });
          }}
        />
        {!customer || cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-3">
            <SectionEmptyState
              title="Ready when you are"
              message="Select a customer and at least one service to enable payment."
              className="py-4"
            />
          </div>
        ) : null}
      </div>

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialPhone={phoneQuery}
        onCreated={(created) => {
          setCustomer(created);
          setPhoneQuery(created.phone);
        }}
      />
    </div>
  );
}

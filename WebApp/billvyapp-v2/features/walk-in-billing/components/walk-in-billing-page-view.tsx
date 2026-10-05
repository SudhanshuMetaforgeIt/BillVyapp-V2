'use client';

import { CouponCodeCard } from './coupon-code-card';

import { MembershipEnrollmentCard, type EnrollmentChoice } from './membership-enrollment-card';
import { useCallback, useMemo, useState } from 'react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/capabilities';
import { SalonPicker } from '@/features/salons/components/salon-picker';
import { computeBillPreview } from '../lib/bill-preview';
import { useSettleWalkInBill } from '../hooks/use-settle-walk-in-bill';
import type {
  ValidatedBillCoupon,
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
  const [chosenSalonId, setChosenSalonId] = useState('');
  const pinnedSalonId = user?.salonId ?? null;
  const salonId = pinnedSalonId ?? (chosenSalonId || null);

  const [phoneQuery, setPhoneQuery] = useState('');
  const [customer, setCustomer] = useState<WalkInCustomer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [serviceSearch, setServiceSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [stylistName, setStylistName] = useState('');
  const [isCouponValidating, setCouponValidating] = useState(false);
  const [coupon, setCoupon] = useState<ValidatedBillCoupon | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<WalkInPaymentMethod>('UPI');

  const discountValue = applyDiscount
    ? Math.max(0, Number(discountAmount) || 0)
    : 0;

  const preview = useMemo(
    () => computeBillPreview(cart, discountValue, coupon),
    [cart, discountValue, coupon],
  );

  const offerKey = `${salonId}:${customer?.id}:${JSON.stringify(cart)}:${preview.total}:${coupon?.couponCode ?? ''}`;
  const [enrollment, setEnrollment] = useState<(EnrollmentChoice & { key: string }) | null>(null);
  const onEnrollmentChange = useCallback((choice: EnrollmentChoice) => setEnrollment({ ...choice, key: offerKey }), [offerKey]);
  const choice = enrollment?.key === offerKey ? enrollment : null;
  const membershipFee = Number(choice?.plan?.price ?? 0);
  const payablePreview = { ...preview, membershipFee, total: Math.round((preview.total + membershipFee) * 100) / 100 };
  const settle = useSettleWalkInBill(() => {
    resetForm();
  });

  function resetForm() {
    setEnrollment(null);
    setPhoneQuery('');
    setCustomer(null);
    setServiceSearch('');
    setCategoryId('');
    setCart([]);
    setStylistName('');
    setApplyDiscount(false);
    setDiscountAmount('');
    setPaymentMethod('UPI');
    setCoupon(null);
    setCouponValidating(false);
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
    preview.total >= 0 &&
    !settle.isPending &&
    !isCouponValidating && (!choice || choice.valid) && (!choice?.plan || !choice.pending);

  const canPickSalon = can(user, 'salons.write');

  if (!salonId && !canPickSalon) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Salon not assigned"
          message="Your account needs a salon assignment before walk-in billing can be used."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 content-lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,22rem)] xl:items-start xl:gap-7">
      <div className="space-y-5">
        {!pinnedSalonId ? (
          <section className="app-surface-card flex flex-wrap items-center gap-3 p-5">
            <label
              htmlFor="walkin-salon"
              className="text-sm font-semibold text-text"
            >
              Branch
            </label>
            <SalonPicker
              id="walkin-salon"
              value={chosenSalonId}
              onChange={(id) => {
                if (id === chosenSalonId) return;
                setCoupon(null);
                setCouponValidating(false);
                setChosenSalonId(id);
                setCart([]);
                setCategoryId('');
              }}
              className="w-64"
            />
            {!salonId ? (
              <p className="text-xs text-text-secondary">
                Choose the branch this bill belongs to.
              </p>
            ) : null}
          </section>
        ) : null}

        <CustomerDetailsSection
          phoneQuery={phoneQuery}
          onPhoneQueryChange={setPhoneQuery}
          selected={customer}
          onSelect={(selected) => {
            setCoupon(null);
            setCouponValidating(false);
            setCustomer(selected);
            setPhoneQuery(selected.phone);
          }}
          onClear={() => {
            setCoupon(null);
            setCouponValidating(false);
            setCustomer(null);
            setPhoneQuery('');
          }}
          onRequestCreate={() => setCreateOpen(true)}
        />

        <AddServicesSection
          enabled={Boolean(customer) && Boolean(salonId)}
          salonId={salonId ?? ''}
          search={serviceSearch}
          onSearchChange={setServiceSearch}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          cart={cart}
          membershipPricing={preview.membershipPricing}
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
        <BillSummaryCard preview={payablePreview} />
        {customer && salonId && cart.length > 0 && <MembershipEnrollmentCard key={offerKey} customer={customer} disabled={settle.isPending} onChange={onEnrollmentChange} payload={{ salonId, customerId: customer.id, couponCode: coupon?.couponCode, discount: preview.discount, items: cart.map(l => ({ itemType: 'SERVICE', serviceId: l.serviceId, quantity: l.quantity })) }} />}
        <CouponCodeCard
          key={`${salonId}:${customer?.id}`}
          salonId={salonId ?? ''}
          customerId={customer?.id ?? ''}
          coupon={coupon}
          onChange={setCoupon}
          onValidationPendingChange={setCouponValidating}
          disabled={settle.isPending}
        />
        <PaymentMethodsCard
          value={paymentMethod}
          onChange={setPaymentMethod}
          canPay={canPay}
          canCollect={can(user, 'bills.status')}
          zeroTotal={payablePreview.total === 0}
          isPaying={settle.isPending}
          onReset={resetForm}
          onPay={() => {
            if (!canPay || !customer || !salonId || cart.length === 0) return;
            settle.mutate({
              expectedTotal: payablePreview.total,
              enrollmentPlanId: choice?.plan?.id ?? null,
              enrollmentDetails: choice?.plan ? { ...choice.details, whatsappNumber: choice.details.whatsappSameAsBilling ? undefined : choice.details.whatsappNumber, dateOfBirth: choice.details.dateOfBirth || undefined, email: choice.details.email?.trim() || undefined, address: choice.details.address?.trim() || undefined } : undefined,
              salonId,
              customerId: customer.id,
              couponCode: coupon?.couponCode,
              discount: preview.discount > 0 ? preview.discount : undefined,
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
          setCoupon(null);
          setCouponValidating(false);
          setCustomer(created);
          setPhoneQuery(created.phone);
        }}
      />
    </div>
  );
}

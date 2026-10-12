'use client';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { getLoyaltyQuote } from '@/features/loyalty/loyalty.service';
import { formatCurrency } from '@/lib/format';

import { CouponCodeCard } from './coupon-code-card';

import {
  MembershipEnrollmentCard,
  type EnrollmentChoice,
} from './membership-enrollment-card';
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
const LazyCreateCustomerDialog = dynamic(
  () =>
    import('./create-customer-dialog').then(
      (module) => module.CreateCustomerDialog,
    ),
  { loading: () => <p role="status">Opening dialog…</p> },
);
function CreateCustomerDialog(
  props: import('react').ComponentProps<
    typeof import('./create-customer-dialog').CreateCustomerDialog
  >,
) {
  return props.open ? <LazyCreateCustomerDialog {...props} /> : null;
}
import { CustomerDetailsSection } from './customer-details-section';
import { getBusinessRegion } from '@/lib/business-region';
import { PaymentMethodsCard } from './payment-methods-card';
import { UpiPaymentDialog } from './upi-payment-dialog';
import type { BillRecord } from '../types/walk-in-billing.types';
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
  const [upiBill, setUpiBill] = useState<BillRecord | null>(null);
  const user = useCurrentUser();
  const [chosenSalonId, setChosenSalonId] = useState('');
  const pinnedSalonId = user?.salonId ?? null;
  const salonId = pinnedSalonId ?? (chosenSalonId || null);

  const [phoneQuery, setPhoneQuery] = useState('');
  const [customer, setCustomer] = useState<WalkInCustomer | null>(null);
  const [loyaltyInput, setLoyaltyInput] = useState('');
  const loyalty = useScopedQuery(['loyalty-quote', salonId, customer?.id], () => getLoyaltyQuote(salonId!, customer!.id), { enabled: Boolean(salonId && customer), staleTime: 0 });
  const [createOpen, setCreateOpen] = useState(false);

  const [serviceSearch, setServiceSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [stylistName, setStylistName] = useState('');
  const [isCouponValidating, setCouponValidating] = useState(false);
  const [coupon, setCoupon] = useState<ValidatedBillCoupon | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountMode, setDiscountMode] = useState<'amount' | 'percentage'>('amount');
  const [paymentMethod, setPaymentMethod] = useState<WalkInPaymentMethod>(
    getBusinessRegion().currency === 'USD' ? 'CARD' : 'UPI',
  );

  const discountValue = applyDiscount
    ? Math.max(0, Number(discountAmount) || 0)
    : 0;
  const discountInvalid = applyDiscount && (
    !Number.isFinite(Number(discountAmount)) || Number(discountAmount) < 0 ||
    (discountMode === 'percentage' && Number(discountAmount) > 100)
  );

  const preview = useMemo(
    () => computeBillPreview(cart, discountValue, coupon, discountMode),
    [cart, discountValue, coupon, discountMode],
  );

  const cartFingerprint = useMemo(
    () =>
      cart
        .map((line) => `${line.serviceId}:${line.quantity}:${line.unitPrice}`)
        .join('|'),
    [cart],
  );

  const offerKey = `${salonId}:${customer?.id}:${cartFingerprint}:${preview.total}:${coupon?.couponCode ?? ''}`;

  const [enrollment, setEnrollment] = useState<
    (EnrollmentChoice & { key: string }) | null
  >(null);
  const onEnrollmentChange = useCallback(
    (c: EnrollmentChoice) => setEnrollment({ ...c, key: offerKey }),
    [offerKey],
  );
  const choice = enrollment?.key === offerKey ? enrollment : null;

  const payablePreview = useMemo(() => {
    const membershipFee = Number(choice?.plan?.price ?? 0);
    return {
      ...preview,
      membershipFee,
      total: Math.round((preview.total + membershipFee) * 100) / 100,
    };
  }, [preview, choice?.plan?.price]);

  const resetForm = useCallback(() => {
    setLoyaltyInput('');
    setEnrollment(null);
    setPhoneQuery('');
    setCustomer(null);
    setServiceSearch('');
    setCategoryId('');
    setCart([]);
    setStylistName('');
    setApplyDiscount(false);
    setDiscountAmount('');
    setDiscountMode('amount');
    setPaymentMethod(getBusinessRegion().currency === 'USD' ? 'CARD' : 'UPI');
    setCoupon(null);
    setCouponValidating(false);
  }, []);

  const settle = useSettleWalkInBill((result) => {
    if (result.outcome === 'awaiting-payment') setUpiBill(result.bill);
    resetForm();
  });

  const addService = useCallback((service: SalonService) => {
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
  }, []);

  const changeQty = useCallback((serviceId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.serviceId !== serviceId);
      }
      return prev.map((line) =>
        line.serviceId === serviceId ? { ...line, quantity } : line,
      );
    });
  }, []);

  const removeLine = useCallback((serviceId: string) => {
    setCart((prev) => prev.filter((line) => line.serviceId !== serviceId));
  }, []);

  const loyaltyPoints = Number(loyaltyInput || 0);
  const loyaltyInvalid = !Number.isSafeInteger(loyaltyPoints) || loyaltyPoints < 0 || (loyaltyPoints > 0 && (!loyalty.data?.canRedeem || loyalty.isFetching || loyaltyPoints > loyalty.data.balance || loyaltyPoints > Math.floor(payablePreview.total)));
  const canPay =
    !loyaltyInvalid &&
    Boolean(salonId) &&
    Boolean(customer) &&
    cart.length > 0 &&
    preview.total >= 0 &&
    !settle.isPending &&
    !isCouponValidating &&
    !discountInvalid &&
    (!choice || choice.valid) &&
    (!choice?.plan || !choice.pending);

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
                setLoyaltyInput('');
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
            setLoyaltyInput('');
            setCoupon(null);
            setCouponValidating(false);
            setCustomer(selected);
            setPhoneQuery(selected.phone);
          }}
          onClear={() => {
            setLoyaltyInput('');
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
          discountMode={discountMode}
          onDiscountModeChange={(mode) => { setDiscountMode(mode); setDiscountAmount(''); }}
          discountInvalid={discountInvalid}
          onDiscountAmountChange={setDiscountAmount}
        />

        <RecentBillsSection customer={customer} />
      </div>

      <div className="space-y-5 xl:sticky xl:top-4">
        <BillSummaryCard preview={payablePreview} loyaltyPoints={!loyaltyInvalid ? loyaltyPoints : 0} />
        {customer && salonId && <section className="app-surface-card space-y-2 p-5"><h2 className="font-semibold">Loyalty points</h2>
          {loyalty.isLoading ? <p role="status">Checking points…</p> : loyalty.isError ? <p className="text-sm">Points could not be loaded. You can pay without points.</p> : loyalty.data?.enabled ? <>
            <p className="text-sm">Balance: {loyalty.data.balance} points · 1 point = {formatCurrency(1)}</p>
            <p className="text-xs text-text-secondary">Minimum balance to redeem: {loyalty.data.minimumRedeemPoints}. Use at any shop in this franchise.</p>
            <label className="block text-sm">Points to use<Input type="number" min="0" max={Math.min(loyalty.data.balance, Math.floor(payablePreview.total))} step="1" value={loyaltyInput} disabled={!loyalty.data.canRedeem || settle.isPending} onChange={(event) => setLoyaltyInput(event.target.value)} placeholder="0" /></label>
            {loyaltyInvalid && <p role="alert" className="text-sm text-danger">Choose whole points within your eligible balance and amount due.</p>}
          </> : <p className="text-sm text-text-secondary">This franchise has not enabled loyalty.</p>}
        </section>}
        {customer && salonId && cart.length > 0 && (
          <MembershipEnrollmentCard
            key={offerKey}
            customer={customer}
            disabled={settle.isPending}
            onChange={onEnrollmentChange}
            payload={{
              salonId,
              customerId: customer.id,
              couponCode: coupon?.couponCode,
              discount: preview.discount,
              items: cart.map((l) => ({
                itemType: 'SERVICE',
                serviceId: l.serviceId,
                quantity: l.quantity,
              })),
            }}
          />
        )}
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
          zeroTotal={payablePreview.total - (!loyaltyInvalid ? loyaltyPoints : 0) === 0}
          isPaying={settle.isPending}
          onReset={resetForm}
          onPay={() => {
            if (!canPay || !customer || !salonId || cart.length === 0) return;
            settle.mutate({
              loyaltyPoints: loyaltyPoints || undefined,
              expectedTotal: payablePreview.total,
              enrollmentPlanId: choice?.plan?.id ?? null,
              enrollmentDetails: choice?.plan
                ? {
                    ...choice.details,
                    whatsappNumber: choice.details.whatsappSameAsBilling
                      ? undefined
                      : choice.details.whatsappNumber,
                    dateOfBirth: choice.details.dateOfBirth || undefined,
                    email: choice.details.email?.trim() || undefined,
                    address: choice.details.address?.trim() || undefined,
                  }
                : undefined,
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
          setLoyaltyInput('');
          setCoupon(null);
          setCouponValidating(false);
          setCustomer(created);
          setPhoneQuery(created.phone);
        }}
      />
      {upiBill && <UpiPaymentDialog key={upiBill.id} bill={upiBill} onClose={() => setUpiBill(null)} />}
    </div>
  );
}

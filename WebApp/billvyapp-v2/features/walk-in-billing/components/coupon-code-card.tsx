'use client';

import { useId, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { TicketCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import type { ApiError } from '@/types/api.types';

import { validateBillCoupon } from '../services/walk-in-billing.service';

import type { ValidatedBillCoupon } from '../types/walk-in-billing.types';



export function CouponCodeCard({

  salonId,

  customerId,

  coupon,

  onChange,

  onValidationPendingChange,

  disabled = false,

}: {

  salonId: string;

  customerId: string;

  coupon: ValidatedBillCoupon | null;

  onChange: (coupon: ValidatedBillCoupon | null) => void;

  onValidationPendingChange?: (pending: boolean) => void;

  disabled?: boolean;

}) {

  const inputId = useId();

  const [code, setCode] = useState(coupon?.couponCode ?? '');

  const check = useMutation<ValidatedBillCoupon, ApiError, string>({

    mutationFn: (couponCode) =>

      validateBillCoupon({ salonId, customerId, couponCode }),

  });

  const enabled = Boolean(salonId && customerId) && !disabled;

  function validate() {

    if (!enabled || !code.trim() || check.isPending) return;

    onChange(null);

    onValidationPendingChange?.(true);

    check.mutate(code, {

      onSuccess: onChange,

      onSettled: () => onValidationPendingChange?.(false),

    });

  }



  return (

    <section className="app-surface-card space-y-3 p-5">

      <h2 className="flex items-center gap-2 text-base font-semibold text-text">

        <TicketCheck className="size-4" aria-hidden />

        Membership coupon

      </h2>

      <div className="space-y-2">

        <Label htmlFor={inputId}>Coupon code</Label>

        <div className="flex gap-2">

          <Input

            id={inputId}

            value={code}

            maxLength={80}

            placeholder="Enter membership coupon"

            autoComplete="off"

            disabled={!enabled || check.isPending}

            onChange={(e) => {

              setCode(e.target.value.toUpperCase());

              onChange(null);

              check.reset();

            }}

            onKeyDown={(e) => {

              if (e.key === 'Enter') {

                e.preventDefault();

                validate();

              }

            }}

          />

          <Button

            type="button"

            variant="outline"

            disabled={!enabled || !code.trim() || check.isPending}

            onClick={validate}

          >

            {check.isPending ? 'Checking...' : 'Validate'}

          </Button>

        </div>

      </div>

      {!salonId || !customerId ? (

        <p className="text-xs text-text-secondary">

          Select a salon and customer to add their coupon.

        </p>

      ) : (

        <p className="text-xs text-text-secondary">

          Eligible services receive the configured membership benefit. Manual discounts remain available.

        </p>

      )}

      {check.isError && (

        <p role="alert" className="text-sm text-danger">

          {check.error.message}

        </p>

      )}

      {coupon && (

        <div

          role="status"

          className="space-y-1 rounded-lg border border-emerald/20 bg-emerald-light p-3 text-sm"

        >

          <p className="font-semibold">

            {coupon.membershipName} coupon attached

          </p>

          {coupon.customer && <p>{coupon.customer.firstName} {coupon.customer.lastName} · {coupon.customer.phone}</p>}

          <p className="break-all font-mono text-xs">{coupon.couponCode}</p>

          <p className="text-xs">Valid until {coupon.endDate}</p>

          {coupon.couponUsageLimit != null && <p>Coupon uses: {coupon.usedVisits ?? 0} / {coupon.couponUsageLimit} · {coupon.remainingVisits} visits remaining{coupon.remainingVisits === 0 ? ' — Usage limit reached. Services use normal prices.' : ''}</p>}
          {coupon.termsAndConditions && <details><summary className="cursor-pointer font-medium">Terms &amp; Conditions</summary><p className="mt-2 whitespace-pre-wrap">{coupon.termsAndConditions}</p></details>}
          {coupon.freeServicesPerVisit && <p>Each eligible service is free once per visit. Extra quantities use normal prices.</p>}
          {coupon.benefitType === 'FREE_SERVICES' && !coupon.freeServicesPerVisit && <p>{coupon.remainingUnits} of {coupon.freeServiceLimit} free units remaining{coupon.remainingUnits === 0 ? ' — Membership free-service allowance exhausted. Services use normal prices.' : ''}</p>}
          {coupon.benefitType === 'PERCENTAGE_DISCOUNT' && <p>Eligible services: {coupon.discountPercentage}% membership discount</p>}
          {coupon.benefits && <p className="text-xs">{coupon.benefits}</p>}

          {coupon.eligibleServices.length > 0 && (

            <p className="text-xs">

              Included services:{' '}

              {coupon.eligibleServices.map((s) => s.name).join(', ')}

            </p>

          )}

          <button

            type="button"

            className="text-xs font-medium underline"

            disabled={disabled || check.isPending}

            onClick={() => {

              setCode('');

              check.reset();

              onChange(null);

            }}

          >

            Remove coupon

          </button>

        </div>

      )}

    </section>

  );

}


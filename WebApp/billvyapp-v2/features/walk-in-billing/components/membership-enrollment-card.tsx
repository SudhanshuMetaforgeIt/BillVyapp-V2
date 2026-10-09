"use client";
import { Input } from "@/components/ui/input";
import { isValidPhoneInput } from "@/lib/phone";
import { useEffect, useState } from "react";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { api } from "@/services/api-client";
import { formatCurrency } from "@/lib/format";
import type {
  CreateBillPayload,
  EnrollmentDetails,
  MembershipOffer,
  WalkInCustomer,
} from "../types/walk-in-billing.types";
export type EnrollmentChoice = {
  plan: MembershipOffer | null;
  details: EnrollmentDetails;
  valid: boolean;
  pending: boolean;
};
export function MembershipEnrollmentCard({
  payload,
  customer,
  disabled,
  onChange,
}: {
  payload: CreateBillPayload;
  customer: WalkInCustomer;
  disabled: boolean;
  onChange: (choice: EnrollmentChoice) => void;
}) {
  const offers = useScopedQuery(
    ["memberships", "billing-offers", payload],
    () =>
      api.post<{ qualifyingAmount: string; plans: MembershipOffer[] }>(
        "/bills/membership-offers",
        payload,
      ),
    { staleTime: 0, placeholderData: undefined },
  );
  const [planId, setPlanId] = useState("");
  const [details, setDetails] = useState<EnrollmentDetails>({
    nameConfirmed: false,
    whatsappSameAsBilling: false,
  });
  const plan = offers.data?.plans.find((p) => p.id === planId) ?? null;
  const valid =
    !planId ||
    Boolean(
      plan &&
      details.nameConfirmed &&
      (details.whatsappSameAsBilling ||
        isValidPhoneInput(details.whatsappNumber ?? "")) &&
      (!details.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) &&
      (!details.dateOfBirth ||
        details.dateOfBirth <= new Date().toISOString().slice(0, 10)),
    );
  useEffect(() => {
    onChange({ plan, details, valid, pending: offers.isLoading });
  }, [plan, details, valid, offers.isLoading, onChange]);
  function field(key: keyof EnrollmentDetails, value: string | boolean) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }
  return (
    <section className="app-surface-card space-y-3 p-5">
      <h2 className="font-semibold">Membership offers</h2>
      <p className="text-sm text-text-secondary">
        Ask the customer whether they want to join a qualifying plan. Membership
        is optional.
      </p>
      {offers.isLoading && <p>Checking eligible plans...</p>}
      {offers.isError && (
        <p role="alert">
          Could not load plans.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void offers.refetch()}
          >
            Retry
          </button>{" "}
          You can continue without enrollment.
        </p>
      )}
      <label className="flex gap-2 text-sm">
        <input
          type="radio"
          name="billing-membership"
          checked={!planId}
          disabled={disabled}
          onChange={() => setPlanId("")}
        />
        No membership — normal billing
      </label>
      {offers.data?.plans.map((p) => (
        <div key={p.id} className="rounded-md border p-3 text-sm">
          <label className="flex gap-2">
            <input
              type="radio"
              name="billing-membership"
              checked={planId === p.id}
              disabled={disabled}
              onChange={() => setPlanId(p.id)}
            />
            <span>
              {p.name} —{" "}
              {Number(p.price) === 0 ? "Free" : formatCurrency(p.price)}
              <br />
              {p.durationDays} days
              {p.couponUsageLimit != null
                ? ` · ${p.couponUsageLimit} benefit visits`
                : ""}
            </span>
          </label>
          {p.benefits && (
            <p className="mt-2 whitespace-pre-wrap">{p.benefits}</p>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer underline">
              Read Terms &amp; Conditions
            </summary>
            <p className="mt-2 whitespace-pre-wrap">
              {p.termsAndConditions || "No additional terms configured."}
            </p>
            <p>
              Eligible services:{" "}
              {p.eligibleServices.map((s) => s.name).join(", ") || "None"}
            </p>
          </details>
        </div>
      ))}
      {offers.isSuccess && !offers.data?.plans.length && (
        <p className="text-sm">No active plans qualify for this bill amount.</p>
      )}
      {plan && (
        <fieldset
          disabled={disabled}
          className="space-y-3 border-t pt-3 text-sm"
        >
          <legend className="font-medium">Confirm enrollment details</legend>
          <p>
            {customer.firstName} {customer.lastName} · {customer.phone}
          </p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={details.nameConfirmed}
              onChange={(e) => field("nameConfirmed", e.target.checked)}
            />
            Customer confirmed the name above
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={details.whatsappSameAsBilling}
              onChange={(e) => field("whatsappSameAsBilling", e.target.checked)}
            />
            WhatsApp number is the same as billing number ({customer.phone})
          </label>
          {!details.whatsappSameAsBilling && (
            <label className="block">
              WhatsApp number
              <Input
                className="mt-1 w-full rounded border p-2"
                type="tel"
                inputMode="tel"
                maxLength={16}
                value={details.whatsappNumber ?? ""}
                onChange={(e) => field("whatsappNumber", e.target.value)}
              />
            </label>
          )}
          <label className="block">
            Date of birth (optional)
            <input
              type="date"
              className="mt-1 w-full rounded border p-2"
              max={new Date().toISOString().slice(0, 10)}
              value={details.dateOfBirth ?? ""}
              onChange={(e) => field("dateOfBirth", e.target.value)}
            />
          </label>
          <label className="block">
            Address (optional)
            <textarea
              className="mt-1 w-full rounded border p-2"
              maxLength={255}
              value={details.address ?? ""}
              onChange={(e) => field("address", e.target.value)}
            />
          </label>
          <label className="block">
            Account email
            <input
              type="email"
              className="mt-1 w-full rounded border p-2"
              maxLength={191}
              value={customer.email ?? ""}
              readOnly
            />
            <span className="text-xs text-muted-foreground">
              Email changes require ownership verification.
            </span>
          </label>
          <p>
            Membership fee added to this bill: {formatCurrency(plan.price)}. The
            new coupon is issued when the bill completes.
          </p>
          {!valid && (
            <p className="text-amber-700">
              Confirm the name and WhatsApp number, and check any optional
              details.
            </p>
          )}
        </fieldset>
      )}
    </section>
  );
}

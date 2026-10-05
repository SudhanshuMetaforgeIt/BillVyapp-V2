"use client";

import { useEffect, useRef, useState } from "react";

import { useScopedQuery } from "@/hooks/use-scoped-query";

import { api } from "@/services/api-client";

import { formatCurrency, formatDate } from "@/lib/format";

import type { MembershipApiItem } from "../types/memberships.types";

type Terms = NonNullable<MembershipApiItem["planSnapshot"]> & { description?: string | null; enrollmentThreshold?: string | null; couponUsageLimit?: number | null; termsAndConditions?: string | null; freeServicesPerVisit?: boolean; benefitType?: string; freeServiceLimit?: number | null; discountPercentage?: string | number | null };

type Details = Omit<MembershipApiItem, "qualifyingBill"> & {

  customer: { whatsappNumber?: string | null; addresses?: { addressLine1: string }[]; customerCode: string; dateOfBirth: string | null; gender: string | null; user: { firstName: string; lastName: string; phone: string | null; email: string | null } };

  plan: Terms;

  salon: { id: string; name: string };

  enrollmentType: string;

  redemptions: { billId: string; id: string; serviceName: string; quantity: number; redeemedAt: string; billNumber: string; billStatus: string; redeemedBy: string; benefitType: string; originalAmount: string; discountAmount: string; finalAmount: string }[];

  qualifyingBill: { billNumber: string; total: string } | null;

};

export function MembershipDetails({ id, onClose }: { id: string; onClose: () => void }) {

  const dialog = useRef<HTMLDialogElement>(null);

  const [copyMessage, setCopyMessage] = useState("");

  const query = useScopedQuery(["memberships", "details", id], () => api.get<Details>(`/memberships/${id}`));

  useEffect(() => { dialog.current?.showModal(); }, []);

  const data = query.data;

  const terms = data?.planSnapshot as Terms | null ?? data?.plan;

  const user = data?.customer.user;
  const usedVisits = new Set(data?.redemptions.map(r => r.billId) ?? []).size;
  const usedUnits = data?.redemptions.filter(r => r.benefitType === 'FREE_SERVICES').reduce((sum, r) => sum + r.quantity, 0) ?? 0;

  const fields = data && terms ? [

    ["Customer", `${user?.firstName} ${user?.lastName}`], ["Billing number", user?.phone], ["WhatsApp number", data.customer.whatsappNumber], ["Address", data.customer.addresses?.map(a => a.addressLine1).join(", ")],

    ["Email", user?.email], ["DOB", data.customer.dateOfBirth ? formatDate(data.customer.dateOfBirth) : null],

    ["Anniversary", "Not recorded"], ["Customer code", data.customer.customerCode], ["Gender", data.customer.gender],

    ["Plan", terms.name], ["Description", terms.description], ["Start date", formatDate(data.startDate)],

    ["End date", formatDate(data.endDate)], ["Status", data.status], ["Salon", data.salon.name],

    ["Enrollment", data.enrollmentType], ["Qualifying bill", data.qualifyingBill?.billNumber],

    ["Qualifying amount", data.qualifyingBill ? formatCurrency(data.qualifyingBill.total) : null],

    ["Plan price", formatCurrency(terms.price)], ["Enrollment threshold", terms.enrollmentThreshold != null ? formatCurrency(terms.enrollmentThreshold) : "Not configured"],

    ["Benefits", terms.benefits], ["Current pricing benefit", data.plan.benefitType ?? "NONE"],
    ["Coupon usage limit", data.plan.couponUsageLimit != null ? `${data.plan.couponUsageLimit} visits` : "No additional visit cap"], ["Visits used", String(usedVisits)],
    ["Terms & Conditions", terms.termsAndConditions ?? data.plan.termsAndConditions],
    ["Discount percentage", data.plan.discountPercentage != null ? `${data.plan.discountPercentage}%` : null],
    ["Free service rule", data.plan.freeServicesPerVisit ? "Each eligible service once per allowed visit" : "Shared service-unit allowance"], ["Free units used", String(usedUnits)], ["Free units remaining", data.plan.freeServiceLimit != null ? String(Math.max(0, data.plan.freeServiceLimit - usedUnits)) : null],
    ["Currently eligible pricing services", data.plan.eligibleServices.map(s => s.name).join(", ")], ["Eligible services", terms.eligibleServices.map(service => service.name).join(", ") || "None configured"],

    ["Duration", `${terms.durationDays} days`], ["Created", formatDate(data.createdAt)], ["Updated", formatDate(data.updatedAt)],

  ] : [];

  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="membership-details-title" className="app-dialog m-auto max-h-[90vh] w-[min(95vw,48rem)] overflow-y-auto rounded-xl bg-white p-6 text-text shadow-xl backdrop:bg-black/45">

    <div className="flex items-center justify-between gap-4"><h2 id="membership-details-title" className="text-xl font-semibold">Membership details</h2><button type="button" onClick={onClose} aria-label="Close membership details">Close</button></div>

    {query.isPending && <p className="py-6">Loading membership…</p>}

    {query.isError && <div className="py-6"><p>Could not load membership details.</p><button type="button" onClick={() => query.refetch()}>Retry</button></div>}

    {data && <>

      <div className="my-5 rounded-lg border border-emerald bg-emerald-light p-4"><p className="font-semibold">Membership coupon</p><p className="my-3 break-all font-mono text-lg">{data.couponCode ?? "No coupon"}</p><button type="button" disabled={!data.couponCode} onClick={async () => { try { await navigator.clipboard.writeText(data.couponCode!); setCopyMessage("Code copied"); } catch { setCopyMessage("Copy failed. Select and copy the code above."); } }} className="font-semibold underline">Copy Code</button><p role="status">{copyMessage}</p></div>

      <dl className="grid gap-4 panel-md:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-sm text-text-secondary">{label}</dt><dd className="break-words font-medium">{value || "—"}</dd></div>)}</dl>

      <h3 className="mt-6 font-semibold">Service redemption history</h3>

      <p className="my-2 text-sm text-text-secondary">Membership remains valid until expiry or cancellation. Individual visits are recorded separately.</p>

      {data.redemptions.length === 0 ? <p>No services redeemed yet.</p> : <ul className="space-y-3">{data.redemptions.map(redemption => <li key={redemption.id} className="rounded-lg border p-3"><p className="font-medium">{redemption.serviceName} × {redemption.quantity}</p><p>{redemption.billNumber} · {redemption.billStatus} · {new Date(redemption.redeemedAt).toLocaleString()}</p><p className="text-xs">Line amounts before tax: original {formatCurrency(redemption.originalAmount)} · membership −{formatCurrency(redemption.discountAmount)} · charged {formatCurrency(redemption.finalAmount)}</p><p className="text-xs">Staff/user: {redemption.redeemedBy}</p></li>)}</ul>}

    </>}

  </dialog>;

}


"use client";

import { useState } from "react";
import { MembershipDetails } from "./membership-details";

import { Eye, MoreVertical, Pencil } from "lucide-react";

import {
  SectionEmptyState,
  SectionErrorState,
} from "@/components/layout/section-states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MemberListRow, PaginationMeta } from "../types/memberships.types";
import { MembershipsPagination } from "./memberships-pagination";

type MembersTableProps = {
  rows: MemberListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

function statusClass(row: MemberListRow): string {
  if (row.status === "EXPIRED" || row.status === "CANCELLED") {
    return "bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger";
  }
  if (row.isExpiringSoon || row.status === "PENDING") {
    return "bg-[color-mix(in_srgb,var(--bv-warning)_14%,white)] text-warning";
  }
  return "bg-emerald-light text-emerald";
}

export function MembersTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: MembersTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <SectionErrorState
        message="We could not load members. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <SectionEmptyState
        title="No members found"
        message="Try adjusting filters, or add a new member."
      />
    );
  }

  return (
    <>
      {selectedId && <MembershipDetails key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
      <div tabIndex={0} role="region" aria-label="Scrollable table" className="app-table-scroll overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Member Name</th>
              <th className="px-4 py-3 font-semibold">Mobile</th>
              <th className="px-4 py-3 font-semibold">Membership Plan</th>
              <th className="px-4 py-3 font-semibold">Start & End Date</th>
              <th className="px-4 py-3 font-semibold">
                Coupon / Services / Bill
              </th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Plan Price</th>
              <th className="px-4 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/60 last:border-0 hover:bg-ivory/50"
              >
                <td className="px-4 py-3.5 text-text-secondary">
                  {row.serial}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-champagne-light text-[11px] font-bold text-charcoal">
                      {row.initials}
                    </span>
                    <button type="button" onClick={() => setSelectedId(row.id)} className="cursor-pointer truncate font-semibold text-emerald underline underline-offset-4" title="View membership details">
                      {row.memberName}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-text">{row.phoneMasked}</td>
                <td className="px-4 py-3.5 font-medium text-text">
                  {row.planName}
                </td>
                <td className="px-4 py-3.5 text-text-secondary">
                  {row.dateRangeLabel}
                </td>
                <td className="px-4 py-3.5 text-text-secondary">
                  <div className="font-mono">{row.couponCode ?? "—"}</div>
                  <div>{row.includedServices || "No included services"}</div>
                  <div>
                    {row.qualifyingBillNumber
                      ? `Bill: ${row.qualifyingBillNumber}`
                      : "Manual enrollment"}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      statusClass(row),
                    )}
                  >
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-medium text-text">
                  {row.planPriceLabel}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                      aria-label={`View ${row.memberName}`}
                      onClick={() => setSelectedId(row.id)}
                      title="View membership details"
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                      aria-label={`Edit ${row.memberName}`}
                      disabled
                      title="Edit coming soon"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                      aria-label={`More actions for ${row.memberName}`}
                      disabled
                      title="Actions coming soon"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MembershipsPagination
        meta={meta}
        noun="members"
        onPageChange={onPageChange}
      />
    </>
  );
}

"use client";
import { MembershipDetails } from "./membership-details";
import { useState } from "react";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { api } from "@/services/api-client";
import type {
  MembershipApiItem,
  PaginatedResponse,
} from "../types/memberships.types";

export function CustomerMemberships({ customerId }: { customerId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const query = useScopedQuery(
    ["memberships", "customer", customerId, page],
    () =>
      api.get<PaginatedResponse<MembershipApiItem>>("/memberships", {
        params: { customerId, page, limit: 10 },
      }),
    { placeholderData: undefined },
  );
  return (
    <section className="mt-4 space-y-3">
      <h3 className="font-semibold">Memberships</h3>
      {selectedId && <MembershipDetails key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
      {query.isLoading && <p>Loading memberships...</p>}
      {query.isError && (
        <p role="alert">
          Could not load memberships.{" "}
          <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      )}
      {query.data?.data.length === 0 && (
        <p className="text-sm text-text-secondary">
          No memberships in your authorized scope.
        </p>
      )}
      {query.data?.data.map((m) => (
        <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">
            {m.membershipName} · {m.status}
          </p>
          <p className="break-all font-mono">
            {m.couponCode ?? "No coupon issued"}
          </p>
          <p>
            {m.startDate} to {m.endDate}
          </p>
          <p>{m.planSnapshot?.benefits}</p>
          <p>
            Included services:{" "}
            {m.planSnapshot?.eligibleServices.map((s) => s.name).join(", ") ||
              "None recorded"}
          </p>
          <button type="button" className="cursor-pointer font-medium underline" onClick={() => setSelectedId(m.id)}>View details &amp; Terms</button>
          {m.qualifyingBill && (
            <p>Qualifying bill: {m.qualifyingBill.billNumber}</p>
          )}
        </div>
      ))}
      {query.data && query.data.meta.totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {query.data.meta.totalPages}
          </span>
          <button
            disabled={page >= query.data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

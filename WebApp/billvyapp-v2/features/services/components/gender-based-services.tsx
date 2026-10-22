"use client";

import { useState } from "react";
import {
  SectionEmptyState,
  SectionErrorState,
} from "@/components/layout/section-states";
import { Skeleton } from "@/components/ui/skeleton";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { GENDERS, genderLabel, type Gender } from "@/lib/gender";
import { formatCurrency } from "@/lib/format";
import { QUERY_FRESHNESS } from "@/lib/query-freshness";
import { api } from "@/services/api-client";
import type {
  PaginatedResponse,
  ServiceApiItem,
  ServiceStatusFilter,
} from "../types/services.types";
import { ServicesPagination } from "./services-pagination";

type GenderBasedServicesProps = {
  salonId?: string;
  search: string;
  categoryId: string;
  status: ServiceStatusFilter;
  categories: Array<{ id: string; name: string }>;
  branches?: Array<{ id: string; name: string }>;
};

function GenderSection({
  gender,
  ...filters
}: GenderBasedServicesProps & { gender: Gender }) {
  const [page, setPage] = useState(1);
  const params = {
    page,
    limit: 10,
    gender,
    includeUnisex: false,
    salonId: filters.salonId || undefined,
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    isActive:
      filters.status === "all" ? undefined : filters.status === "active",
  };
  const query = useScopedQuery(
    ["services", "gender-based", params],
    () => api.get<PaginatedResponse<ServiceApiItem>>("/services", { params }),
    {
      capability: "catalog.read",
      staleTime: QUERY_FRESHNESS.catalog,
      placeholderData: undefined,
    },
  );
  const categoryNames = new Map(
    filters.categories.map((category) => [category.id, category.name]),
  );
  const branchNames = new Map(
    filters.branches?.map((branch) => [branch.id, branch.name]),
  );
  const groups = new Map<string, ServiceApiItem[]>();
  for (const service of query.data?.data ?? []) {
    const group = groups.get(service.categoryId) ?? [];
    group.push(service);
    groups.set(service.categoryId, group);
  }

  return (
    <section
      aria-labelledby={`catalog-${gender}`}
      className="app-surface-card min-w-0 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2
          id={`catalog-${gender}`}
          className="text-base font-semibold text-text"
        >
          {genderLabel(gender)}
        </h2>
        {query.data && (
          <span className="rounded-full bg-champagne-light px-2.5 py-1 text-xs font-semibold text-charcoal">
            {query.data.meta.total} {query.data.meta.total === 1 ? 'service' : 'services'}
          </span>
        )}
      </div>
      {query.isLoading ? (
        <div
          className="space-y-3 p-5"
          role="status"
          aria-label={`Loading ${genderLabel(gender)} services`}
        >
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : query.isError ? (
        <SectionErrorState
          message="Could not load services."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.data.length ? (
        <SectionEmptyState
          message={`No ${genderLabel(gender).toLowerCase()} services match these filters.`}
        />
      ) : (
        <div className="space-y-5 p-5">
          {[...groups].map(([categoryId, services]) => (
            <div key={categoryId}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {categoryNames.get(categoryId) ?? "Services"}
              </h3>
              <ul className="divide-y divide-border/60">
                {services.map((service) => (
                  <li
                    key={service.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-text">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="mt-1 break-words text-xs text-text-secondary">
                          {service.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-secondary">
                        {service.durationMinutes} mins ·{" "}
                        {service.isActive ? "Active" : "Inactive"}
                        {branchNames.has(service.salonId) &&
                          ` · ${branchNames.get(service.salonId)}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-text">
                      {formatCurrency(service.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {query.data && query.data.meta.totalPages > 1 && (
        <ServicesPagination
          meta={query.data.meta}
          noun="services"
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

export function GenderBasedServices(props: GenderBasedServicesProps) {
  const filterKey = JSON.stringify([
    props.salonId,
    props.search,
    props.categoryId,
    props.status,
  ]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Services organized by gender, then by service category.
      </p>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {GENDERS.map((gender) => (
          <GenderSection
            key={`${gender}:${filterKey}`}
            gender={gender}
            {...props}
          />
        ))}
      </div>
    </div>
  );
}

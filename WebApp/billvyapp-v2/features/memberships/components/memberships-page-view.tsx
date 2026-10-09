"use client";
import dynamic from 'next/dynamic';

import { useDeferredValue, useRef, useState, useTransition } from "react";

import { SalonPicker } from "@/features/salons/components/salon-picker";
import type { MembershipPlanApiItem } from "../types/memberships.types";
import { SectionErrorState } from "@/components/layout/section-states";
import { MetricGrid } from "@/features/dashboard/components/metric-card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { playDashboardEntrance, useGSAP } from "@/lib/animations";
import { useMemberships } from "../hooks/use-memberships";
import type {
  MembershipStatusFilter,
  MembershipsTab,
} from "../types/memberships.types";
const LazyAddMemberDialog = dynamic(() => import('./add-member-dialog').then((module) => module.AddMemberDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AddMemberDialog(props: import('react').ComponentProps<typeof import('./add-member-dialog').AddMemberDialog>) {
  return props.open ? <LazyAddMemberDialog {...props} /> : null;
}
const LazyAddPlanDialog = dynamic(() => import('./add-plan-dialog').then((module) => module.AddPlanDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AddPlanDialog(props: import('react').ComponentProps<typeof import('./add-plan-dialog').AddPlanDialog>) {
  return props.open ? <LazyAddPlanDialog {...props} /> : null;
}
import { MembersTable } from "./members-table";
import { MembershipsFilters } from "./memberships-filters";
import { MembershipsSummaryCards } from "./memberships-summary-cards";
import { MembershipsTabs } from "./memberships-tabs";
import { PlansTable } from "./plans-table";

const PAGE_SIZE = 10;

export function MembershipsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const user = useCurrentUser();
  const [selectedSalon, setSelectedSalon] = useState("");
  const salonId = user?.salonId ?? selectedSalon;
  const canManage = ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(
    user?.role ?? "",
  );

  const [tab, setTab] = useState<MembershipsTab>("members");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<MembershipStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<
    MembershipPlanApiItem | undefined
  >();
  const [addPlanOpen, setAddPlanOpen] = useState(false);

  const query = useMemberships({
    salonId,
    tab,
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    planId,
    status,
  });

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess, tab], scope: rootRef },
  );

  if (!canManage) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Membership management unavailable"
          message="Membership plan management requires a Manager, Admin, or Super Admin account."
        />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Memberships unavailable"
          message="We could not load memberships. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;
  const emptyMeta = {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
          className="xl:grid-cols-4"
          skeletonCount={4}
        />

        <div
          className="app-surface-card overflow-hidden"
          data-dash-animate="section"
        >
          <MembershipsTabs
            value={tab}
            onChange={(value) => {
              startTransition(() => {
                setPage(1);
                setTab(value);
                setSearchInput("");
                setPlanId("");
                setStatus("all");
              });
            }}
          />

          <div className="space-y-4 p-4 sm:p-5">
            <SalonPicker
              value={salonId}
              onChange={(id) => {
                setSelectedSalon(id);
                setPage(1);
              }}
              allowAll
              activeOnly={false}
            />
            <MembershipsFilters
              tab={tab}
              search={searchInput}
              onSearchChange={(value) => {
                setSearchInput(value);
                setPage(1);
              }}
              planId={planId}
              onPlanIdChange={(value) => {
                startTransition(() => {
                  setPlanId(value);
                  setPage(1);
                });
              }}
            planOptions={(data?.planOptions ?? []).filter((p) => p.isActive && p.manualEnrollmentAllowed)}
              status={status}
              onStatusChange={(value) => {
                startTransition(() => {
                  setStatus(value);
                  setPage(1);
                });
              }}
              onPrimaryAction={() => {
                if (tab === "members") setAddMemberOpen(true);
                else {
                  setEditingPlan(undefined);
                  setAddPlanOpen(true);
                }
              }}
            />

            {tab === "members" ? (
              <MembersTable
                rows={data?.memberRows ?? []}
                meta={data?.memberMeta ?? emptyMeta}
                isLoading={query.isLoading && !data}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                onPageChange={(next) => {
                  startTransition(() => setPage(next));
                }}
              />
            ) : (
              <PlansTable
                onEdit={(plan) => {
                  setEditingPlan(plan);
                  setAddPlanOpen(true);
                }}
                rows={data?.planRows ?? []}
                meta={data?.planMeta ?? emptyMeta}
                isLoading={query.isLoading && !data}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                onPageChange={(next) => {
                  startTransition(() => setPage(next));
                }}
              />
            )}
          </div>
        </div>

        <MembershipsSummaryCards
          popularPlans={data?.popularPlans ?? []}
          monthSummary={
            data?.monthSummary ?? {
              newMemberships: 0,
              renewedLabel: "—",
              revenueLabel: "—",
              visitsLabel: "—",
              incomplete: false,
            }
          }
          onViewPlans={() => {
            startTransition(() => {
              setTab("plans");
              setPage(1);
            });
          }}
        />
      </div>

      {addMemberOpen && (
        <AddMemberDialog
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          planOptions={(data?.planOptions ?? []).filter((p) => p.isActive)}
          customerOptions={data?.customerOptions ?? []}
        />
      )}

      {addPlanOpen && (
        <AddPlanDialog
          open={addPlanOpen}
          onOpenChange={setAddPlanOpen}
          salonId={salonId}
          plan={editingPlan}
        />
      )}
    </>
  );
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api-client";
import {
  createMembershipPlan,
  fetchMembershipServices,
  fetchMembershipsPage,
  setMembershipPlanStatus,
  updateMembershipPlan,
} from "./memberships.service";
vi.mock("@/services/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
vi.mock("@/lib/business-calendar", () => ({
  businessMonthBounds: () => ({ dateFrom: "2026-10-01", dateTo: "2026-10-31" }),
  businessCalendarDateOfInstant: (d: Date) => d.toISOString().slice(0, 10),
}));
const plan = {
  id: "plan",
  salonId: "salon",
  salonName: "Branch One",
  name: "Updated Club",
  description: null,
  price: "999.00",
  durationDays: 30,
  isActive: true,
  enrollmentThreshold: "499.00",
  eligibleServices: [{ id: "new-service", name: "Facial" }],
  createdAt: "2026-10-01",
  updatedAt: "2026-10-02",
};
const membership = {
  id: "member",
  customerId: "customer",
  membershipPlanId: "plan",
  salonId: "salon",
  membershipName: "Original Club",
  couponCode: "CLUB-COUPON",
  qualifyingBillId: "bill",
  qualifyingBill: { id: "bill", billNumber: "B-001" },
  planSnapshot: {
    name: "Original Club",
    price: "499.00",
    eligibleServices: [{ id: "old-service", name: "Hair Spa" }],
    durationDays: 90,
  },
  startDate: "2026-10-01",
  endDate: "2026-12-30",
  status: "ACTIVE",
  createdAt: "2026-10-01",
  updatedAt: "2026-10-01",
};
const customer = {
  id: "customer",
  firstName: "Riya",
  lastName: "Shah",
  phone: "9999999999",
  email: "riya@example.com",
};
const page = (data: unknown[]) => ({
  data,
  meta: {
    page: 1,
    limit: 10,
    total: data.length,
    totalPages: data.length ? 1 : 0,
  },
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.get).mockImplementation(
    async (url: string) =>
      page(
        url === "/memberships"
          ? [membership]
          : url === "/membership-plans"
            ? [plan]
            : url === "/customers"
              ? [customer]
              : [],
      ) as never,
  );
});
describe("Dynamic membership API and dashboard", () => {
  it("uses existing create and edit endpoints with dynamic terms", async () => {
    const payload = {
      salonId: "salon",
      name: "Summer Club",
      price: 499,
      durationDays: 90,
      enrollmentThreshold: 499,
      benefits: "Hair Spa",
      eligibleServiceIds: ["service"],
      couponPrefix: "SUMMER",
      isActive: false,
    };
    await createMembershipPlan(payload);
    expect(api.post).toHaveBeenCalledWith("/membership-plans", payload);
    await updateMembershipPlan("plan", {
      name: "New Name",
      enrollmentThreshold: null,
      eligibleServiceIds: [],
    } as never);
    expect(api.patch).toHaveBeenCalledWith("/membership-plans/plan", {
      name: "New Name",
      enrollmentThreshold: null,
      eligibleServiceIds: [],
    });
  });
  it.each([false, true])(
    "uses soft activation endpoint (%s)",
    async (isActive) => {
      await setMembershipPlanStatus("plan", isActive);
      expect(api.patch).toHaveBeenCalledWith("/membership-plans/plan/status", {
        isActive,
      });
    },
  );
  it("loads all catalog pages with selected salon scope", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [{ id: "one", name: "Haircut" }],
        meta: { totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id: "two", name: "Spa" }],
        meta: { totalPages: 2 },
      });
    expect(await fetchMembershipServices("salon")).toHaveLength(2);
    expect(api.get).toHaveBeenNthCalledWith(2, "/services", {
      params: { salonId: "salon", page: 2, limit: 100 },
    });
  });
  it("passes salon filtering to all membership reads and metrics", async () => {
    const data = await fetchMembershipsPage({
      tab: "plans",
      page: 1,
      limit: 10,
      salonId: "salon",
      search: "",
      planId: "",
      status: "all",
    });
    for (const [url, config] of vi.mocked(api.get).mock.calls) {
      if (url === "/membership-plans" || url === "/memberships")
        expect(config?.params.salonId).toBe("salon");
    }
    expect(data.planRows[0]).toMatchObject({
      salonName: "Branch One",
      servicesLabel: "Facial",
    });
    expect(data.planRows[0].thresholdLabel).toContain("499");
  });
  it("preserves issued name, services and price after plan edits", async () => {
    const data = await fetchMembershipsPage({
      tab: "members",
      page: 1,
      limit: 10,
      search: "",
      planId: "",
      status: "all",
    });
    expect(data.memberRows[0]).toMatchObject({
      planName: "Original Club",
      couponCode: "CLUB-COUPON",
      includedServices: "Hair Spa",
      qualifyingBillNumber: "B-001",
    });
    expect(data.memberRows[0].planPriceLabel).toContain("499");
    // A complimentary automatic enrollment is not a sale of the plan price.
    expect(data.monthSummary.revenueLabel).not.toContain("499");
  });
  it("displays disabled automatic enrollment for null thresholds", async () => {
    vi.mocked(api.get).mockImplementation(
      async (url: string) =>
        page(
          url === "/membership-plans"
            ? [{ ...plan, enrollmentThreshold: null }]
            : [],
        ) as never,
    );
    const data = await fetchMembershipsPage({
      tab: "plans",
      page: 1,
      limit: 10,
      search: "",
      planId: "",
      status: "all",
    });
    expect(data.planRows[0].thresholdLabel).toBe("Disabled");
  });
});

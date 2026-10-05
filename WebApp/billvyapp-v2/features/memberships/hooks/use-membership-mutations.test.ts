import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateMembershipPlanPayload } from "../types/memberships.types";
import { api } from "@/services/api-client";
import { useSaveMembershipPlan } from "./use-membership-mutations";

type SaveInput = { id?: string; payload: CreateMembershipPlanPayload };
const captured = vi.hoisted(() => ({ mutationFn: undefined as undefined | ((input: SaveInput) => Promise<unknown>) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: (options: { mutationFn: (input: SaveInput) => Promise<unknown> }) => {
    captured.mutationFn = options.mutationFn;
    return {};
  },
}));
vi.mock("@/services/api-client", () => ({ api: { post: vi.fn(), patch: vi.fn() } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const payload: CreateMembershipPlanPayload = {
  salonId: "salon", name: "Visit Plan", price: 0, durationDays: 90,
  benefitType: "FREE_SERVICES", freeServicesPerVisit: true,
  freeServiceLimit: null, discountPercentage: null, couponUsageLimit: 5,
  termsAndConditions: "Eligible services once per visit", eligibleServiceIds: ["service"],
};
beforeEach(() => { vi.resetAllMocks(); captured.mutationFn = undefined; });
describe("Saving plan rules from the edit form", () => {
  it.each([3, 7, 12])("sends an edited visit cap of %s with the pricing rules and T&C", async cap => {
    useSaveMembershipPlan();
    await captured.mutationFn!({ id: "plan", payload: { ...payload, couponUsageLimit: cap } });
    expect(api.patch).toHaveBeenCalledWith("/membership-plans/plan", expect.objectContaining({
      couponUsageLimit: cap, freeServicesPerVisit: true, benefitType: "FREE_SERVICES",
      freeServiceLimit: null, discountPercentage: null, termsAndConditions: payload.termsAndConditions,
    }));
    expect(api.post).not.toHaveBeenCalled();
  });
  it("preserves an explicitly cleared visit cap for plans that allow it", async () => {
    useSaveMembershipPlan();
    await captured.mutationFn!({ id: "plan", payload: { ...payload, couponUsageLimit: null, freeServicesPerVisit: false, freeServiceLimit: 10 } });
    expect(api.patch).toHaveBeenCalledWith("/membership-plans/plan", expect.objectContaining({ couponUsageLimit: null, freeServicesPerVisit: false, freeServiceLimit: 10 }));
  });
  it("sends a custom visit cap when creating a new plan", async () => {
    useSaveMembershipPlan();
    await captured.mutationFn!({ payload: { ...payload, couponUsageLimit: 9 } });
    expect(api.post).toHaveBeenCalledWith("/membership-plans", { ...payload, couponUsageLimit: 9 });
  });
});

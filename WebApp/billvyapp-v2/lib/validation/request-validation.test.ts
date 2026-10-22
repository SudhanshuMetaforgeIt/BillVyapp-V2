import { describe, expect, it } from "vitest";
import {
  getRequestSchema,
  validateRequestInput,
  boundedInputSchema,
  validationError,
} from "./request-validation";
import contracts from "./generated-contracts.json";
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const customer = {
  gender: "FEMALE",
  firstName: "Riya",
  lastName: "Sharma",
  email: "riya@example.test",
  phone: "+919876543210",
};
const product = {
  salonId: id,
  categoryId: other,
  name: "Shampoo",
  sku: "SH001",
  sellingPrice: "100.50",
  reorderLevel: "5",
  measurementUnit: "ML",
  packageSize: "1000",
};
describe("Shared Zod request validation", () => {
  it.each(['MALE', 'FEMALE', 'OTHER', 'UNISEX'])('accepts required customer gender %s', gender => {
    expect(getRequestSchema('CreateCustomerDto').safeParse({ ...customer, gender }).success).toBe(true);
  });
  it.each([undefined, null, '', 'INVALID', 'PREFER_NOT_TO_SAY'])('rejects missing or invalid customer gender %s', gender => {
    expect(getRequestSchema('CreateCustomerDto').safeParse({ ...customer, gender }).success).toBe(false);
  });
  it('permits omitted patch gender but rejects null gender', () => {
    expect(getRequestSchema('UpdateCustomerDto').safeParse({ firstName: 'Updated' }).success).toBe(true);
    expect(getRequestSchema('UpdateCustomerDto').safeParse({ gender: null }).success).toBe(false);
  });
  it("builds every generated contract without importing backend code", () => {
    for (const name of Object.keys(contracts.contracts))
      expect(getRequestSchema(name)).toBeDefined();
  });
  it("normalizes valid product numeric strings without truncating them", () => {
    expect(
      validateRequestInput("POST", "/products", product, "body"),
    ).toMatchObject({
      sellingPrice: 100.5,
      reorderLevel: 5,
      packageSize: 1000,
    });
  });
  it.each(["", " ", true, NaN, Infinity, -1, "1.5", "5abc"])(
    "rejects invalid reorder quantities %s",
    (value) => {
      expect(
        getRequestSchema("CreateProductDto").safeParse({
          ...product,
          reorderLevel: value,
        }).success,
      ).toBe(false);
    },
  );
  it("rejects blank prices but permits an explicitly free product", () => {
    expect(
      getRequestSchema("CreateProductDto").safeParse({
        ...product,
        sellingPrice: "",
      }).success,
    ).toBe(false);
    expect(
      getRequestSchema("CreateProductDto").safeParse({
        ...product,
        sellingPrice: "0",
      }).success,
    ).toBe(true);
  });
  it("enforces money precision and whole package pieces", () => {
    expect(
      getRequestSchema("CreateProductDto").safeParse({
        ...product,
        sellingPrice: "1.999",
      }).success,
    ).toBe(false);
    expect(
      getRequestSchema("CreateProductDto").safeParse({
        ...product,
        measurementUnit: "PCS",
        packageSize: "1.5",
      }).success,
    ).toBe(false);
    expect(
      getRequestSchema("CreateProductDto").safeParse({
        ...product,
        packageSize: "0.001",
      }).success,
    ).toBe(true);
  });
  it("validates email, international phone formats and name length", () => {
    const schema = getRequestSchema("CreateCustomerDto");
    expect(schema.safeParse(customer).success).toBe(true);
    expect(
      schema.safeParse({ ...customer, phone: "+14155552671" }).success,
    ).toBe(true);
    expect(schema.safeParse({ ...customer, email: "invalid" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...customer, phone: "123" }).success).toBe(false);
    expect(
      schema.safeParse({ ...customer, firstName: " ".repeat(5) }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...customer, firstName: "x".repeat(101) }).success,
    ).toBe(false);
  });
  it("rejects customer role/status mass assignment and immutable service ownership updates", () => {
    expect(() =>
      validateRequestInput(
        "POST",
        "/customers",
        { ...customer, roleId: id },
        "body",
      ),
    ).toThrow();
    expect(() =>
      validateRequestInput(
        "PATCH",
        `/services/${id}`,
        { name: "Updated", salonId: other },
        "body",
      ),
    ).toThrow();
    expect(
      validateRequestInput(
        "PATCH",
        `/services/${id}`,
        { name: "Updated" },
        "body",
      ),
    ).toEqual({ name: "Updated" });
  });
  it("validates nested bill identity and quantities", () => {
    const base = {
      salonId: id,
      customerId: other,
      serviceGender: "UNISEX",
      idempotencyKey: "bill-request-123",
      items: [{ itemType: "SERVICE", serviceId: other, quantity: 1 }],
    };
    expect(getRequestSchema("CreateBillDto").safeParse(base).success).toBe(
      true,
    );
    expect(
      getRequestSchema("CreateBillDto").safeParse({
        ...base,
        items: [{ itemType: "SERVICE", quantity: 1 }],
      }).success,
    ).toBe(false);
    expect(
      getRequestSchema("CreateBillDto").safeParse({
        ...base,
        items: [
          { itemType: "SERVICE", serviceId: other, productId: id, quantity: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(
      getRequestSchema("CreateBillDto").safeParse({
        ...base,
        items: [{ itemType: "SERVICE", serviceId: other, quantity: 0 }],
      }).success,
    ).toBe(false);
  });
  it("protects percentage recipe limits, uniqueness and precision", () => {
    const base = {
      salonId: id,
      categoryId: other,
      gender: "UNISEX",
      name: "Hairwash",
      price: "200",
      durationMinutes: "30",
      taxRate: "18",
      productRecipe: [{ productId: id, mode: "PERCENT", value: 5 }],
    };
    const schema = getRequestSchema("CreateServiceDto");
    expect(schema.safeParse(base).success).toBe(true);
    expect(
      schema.safeParse({
        ...base,
        productRecipe: [{ ...base.productRecipe[0], value: 101 }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        productRecipe: [base.productRecipe[0], base.productRecipe[0]],
      }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...base, durationMinutes: "3.5" }).success).toBe(
      false,
    );
  });
  it("rejects forged provider source and validates payment amount/currency", () => {
    const base = {
      idempotencyKey: "payment-test-123",
      billId: id,
      paymentMethod: "UPI",
      amount: "100.50",
      source: "MANUAL",
      currency: "INR",
    };
    const schema = getRequestSchema("CreatePaymentDto");
    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, source: "GATEWAY" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...base, currency: "GBP" }).success).toBe(false);
  });
  it("handles partial updates, nullable optional values and country codes", () => {
    expect(
      validateRequestInput(
        "PATCH",
        `/franchises/${id}`,
        { email: null },
        "body",
      ),
    ).toEqual({ email: null });
    expect(
      validateRequestInput(
        "POST",
        "/franchises",
        { name: "Group", code: " lower123 ", phoneCountry: "US" },
        "body",
      ),
    ).toMatchObject({ code: "LOWER123" });
    expect(() =>
      validateRequestInput(
        "POST",
        "/franchises",
        { name: "Group", code: "GROUP", phoneCountry: "GB" },
        "body",
      ),
    ).toThrow();
  });
  it("validates optional business contact phone numbers", () => {
    const base = { name: "Group", code: "GROUP", phoneCountry: "US" };
    expect(
      getRequestSchema("CreateFranchiseDto").safeParse({
        ...base,
        phone: "+14155552671",
      }).success,
    ).toBe(true);
    expect(
      getRequestSchema("CreateFranchiseDto").safeParse({
        ...base,
        phone: "123",
      }).success,
    ).toBe(false);
  });
  it("rejects malformed email notification recipients before queuing", () => {
    const base = {
      channel: "EMAIL",
      notificationType: "GENERAL",
      recipient: "invalid",
      message: "Test",
    };
    expect(
      getRequestSchema("CreateNotificationDto").safeParse(base).success,
    ).toBe(false);
    expect(
      getRequestSchema("CreateNotificationDto").safeParse({
        ...base,
        recipient: "recipient@example.test",
      }).success,
    ).toBe(true);
  });
  it("rejects impossible dates and reversed report date ranges", () => {
    expect(
      getRequestSchema("CreateCustomerDto").safeParse({
        ...customer,
        dateOfBirth: "2026-02-31",
      }).success,
    ).toBe(false);
    expect(() =>
      validateRequestInput(
        "GET",
        "/inventory/consumption",
        { dateFrom: "2026-10-13", dateTo: "2026-10-01" },
        "query",
      ),
    ).toThrow();
    expect(
      validateRequestInput(
        "GET",
        "/inventory/consumption",
        { dateFrom: "2026-10-01", dateTo: "2026-10-13" },
        "query",
      ),
    ).toBeDefined();
  });
  it("validates pagination and explicitly parses false query booleans", () => {
    expect(() =>
      validateRequestInput("GET", "/products", { page: 0 }, "query"),
    ).toThrow();
    expect(() =>
      validateRequestInput("GET", "/products", { limit: 1000000 }, "query"),
    ).toThrow();
    expect(
      validateRequestInput(
        "GET",
        "/products",
        { page: "1", limit: "10", isActive: "false" },
        "query",
      ),
    ).toMatchObject({ page: 1, limit: 10, isActive: false });
  });
  it("selects specific routes before dynamic IDs and permits serialized retries", () => {
    expect(
      validateRequestInput(
        "POST",
        `/api/payments/loyalty/${id}`,
        { idempotencyKey: "loyalty-key-123", points: 10 },
        "body",
      ),
    ).toBeDefined();
    expect(
      validateRequestInput(
        "POST",
        "/customers",
        JSON.stringify(customer),
        "body",
      ),
    ).toMatchObject(customer);
  });
  it("bounds generic JSON, dangerous properties and nested configuration", () => {
    expect(
      boundedInputSchema.safeParse({ text: "x".repeat(8193) }).success,
    ).toBe(false);
    expect(
      boundedInputSchema.safeParse({ items: Array(1001).fill(1) }).success,
    ).toBe(false);
    expect(
      boundedInputSchema.safeParse(JSON.parse('{"__proto__":{"role":"ADMIN"}}'))
        .success,
    ).toBe(false);
    let nested: unknown = {};
    for (let i = 0; i < 14; i++) nested = { nested };
    expect(boundedInputSchema.safeParse(nested).success).toBe(false);
  });
  it("does not echo passwords or secret values in validation errors", () => {
    const result = getRequestSchema("CreateUserDto").safeParse({
      password: "sensitive",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(JSON.stringify(validationError(result.error))).not.toContain(
        "sensitive",
      );
  });
  it("leaves binary upload transport unchanged", () => {
    const data = new FormData();
    data.append("file", new Blob(["synthetic"]), "test.txt");
    expect(validateRequestInput("POST", "/media/upload", data, "body")).toBe(
      data,
    );
  });
});

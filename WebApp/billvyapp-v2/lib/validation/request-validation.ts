import { z } from "zod";
import { isValidPhoneInput } from "@/lib/phone";
import type { ApiError } from "@/types/api.types";
import generated from "./generated-contracts.json";

type Rule = { name: string; args: unknown[] };
type Field = {
  kind: string;
  optional: boolean;
  nullable: boolean;
  rules: Rule[];
  nested?: string;
  array?: boolean;
  split?: boolean;
  numericInput?: boolean;
  booleanInput?: boolean;
  uppercase?: boolean;
  emptyToNull?: boolean;
  allowEmpty?: boolean;
};
const contracts = generated.contracts as Record<
  string,
  { fields: Record<string, Field> }
>;
const cache = new Map<string, z.ZodType>();
const label = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Id$/, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
const numericInput = (value: unknown) =>
  typeof value === "string" &&
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
    ? Number(value)
    : value;
const decimals = (value: number, places: number) =>
  Math.abs(value * 10 ** places - Math.round(value * 10 ** places)) < 0.000001;
const isoDate = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true, local: true }),
  z.date(),
]);

function fieldSchema(name: string, field: Field): z.ZodType {
  const title = label(name);
  let schema: z.ZodType;
  if (field.nested) schema = z.lazy(() => getRequestSchema(field.nested!));
  else if (field.kind === "number")
    schema = z.number({ error: `${title} must be a finite number` });
  else if (field.kind === "boolean")
    schema = z.boolean({ error: `${title} must be true or false` });
  else if (field.kind === "date") schema = isoDate;
  else if (field.kind === "json") schema = z.record(z.string(), z.unknown());
  else if (field.kind === "string")
    schema = z.string({ error: `${title} is required` });
  else schema = z.unknown();
  for (const rule of field.rules) {
    const number = Number(rule.args[0]);
    switch (rule.name) {
      case "IsNotEmpty":
        schema = schema.refine(
          (v) => v !== "" && v !== null && v !== undefined,
          `${title} is required`,
        );
        break;
      case "IsEmail":
        schema = schema.refine(
          (v) => typeof v === "string" && z.email().safeParse(v).success,
          `Enter a valid ${title.toLowerCase()}`,
        );
        break;
      case "IsUUID":
        schema = schema.refine(
          (v) => typeof v === "string" && z.uuid().safeParse(v).success,
          `Select a valid ${title.toLowerCase()}`,
        );
        break;
      case "IsInt":
        schema = schema.refine(
          (v) => typeof v === "number" && Number.isSafeInteger(v),
          `${title} must be a whole number`,
        );
        break;
      case "IsNumber": {
        const options = rule.args[0] as { maxDecimalPlaces?: number } | null;
        if (options?.maxDecimalPlaces !== undefined)
          schema = schema.refine(
            (v) =>
              typeof v === "number" && decimals(v, options.maxDecimalPlaces!),
            `${title} allows at most ${options.maxDecimalPlaces} decimal places`,
          );
        break;
      }
      case "Min":
        schema = schema.refine(
          (v) => typeof v === "number" && v >= number,
          `${title} must be at least ${number}`,
        );
        break;
      case "Max":
        schema = schema.refine(
          (v) => typeof v === "number" && v <= number,
          `${title} must be at most ${number}`,
        );
        break;
      case "MinLength":
        schema = schema.refine(
          (v) => typeof v === "string" && Array.from(v).length >= number,
          `${title} must contain at least ${number} characters`,
        );
        break;
      case "MaxLength":
        schema = schema.refine(
          (v) => typeof v === "string" && Array.from(v).length <= number,
          `${title} must contain at most ${number} characters`,
        );
        break;
      case "IsEnum":
      case "IsIn": {
        const values = Array.isArray(rule.args[0])
          ? rule.args[0]
          : Object.values(rule.args[0] as Record<string, unknown>);
        schema = schema.refine(
          (v) => values.includes(v),
          `Select a valid ${title.toLowerCase()}`,
        );
        break;
      }
      case "Equals":
        schema = schema.refine(
          (v) => v === rule.args[0],
          `${title} must be ${String(rule.args[0])}`,
        );
        break;
      case "NotEquals":
        schema = schema.refine(
          (v) => v !== rule.args[0],
          `${title} is invalid`,
        );
        break;
      case "Matches": {
        const regex = rule.args[0] as { pattern: string; flags: string };
        const pattern = new RegExp(
          regex.pattern,
          regex.flags.replace(/[gy]/g, ""),
        );
        schema = schema.refine(
          (v) => typeof v === "string" && pattern.test(v),
          `${title} has an invalid format`,
        );
        // Calendar-date regex alone permits dates such as February 31.
        if (regex.pattern === "^\\d{4}-\\d{2}-\\d{2}$")
          schema = schema.refine(
            (v) => z.iso.date().safeParse(v).success,
            `${title} must be a valid calendar date`,
          );
        break;
      }
      case "IsIndianMobileNumber":
      case "IsOptionalIndianMobileNumber":
        schema = schema.refine(
          (v) => typeof v === "string" && isValidPhoneInput(v),
          "Enter 10 local digits or a valid international phone number",
        );
        break;
      case "IsHexColor":
        schema = schema.refine(
          (v) =>
            typeof v === "string" &&
            /^#?(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(v),
          `${title} must be a valid color`,
        );
        break;
      case "IsJWT":
        schema = schema.refine(
          (v) =>
            typeof v === "string" &&
            /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v),
          `${title} has an invalid format`,
        );
        break;
    }
  }
  if (field.array) {
    schema = z.array(schema);
    for (const rule of field.rules) {
      if (rule.name === "ArrayMinSize")
        schema = schema.refine(
          (v) => Array.isArray(v) && v.length >= Number(rule.args[0]),
          `${title} requires at least ${rule.args[0]} item(s)`,
        );
      if (rule.name === "ArrayMaxSize")
        schema = schema.refine(
          (v) => Array.isArray(v) && v.length <= Number(rule.args[0]),
          `${title} allows at most ${rule.args[0]} items`,
        );
      if (rule.name === "ArrayUnique")
        schema = schema.refine(
          (v) => Array.isArray(v) && new Set(v).size === v.length,
          `${title} contains duplicate values`,
        );
    }
  }
  if (field.allowEmpty) schema = z.union([schema, z.literal("")]);
  if (field.nullable) schema = schema.nullable();
  if (field.optional) schema = schema.optional();
  return z.preprocess((value) => {
    if (
      typeof value === "string" &&
      field.kind === "string" &&
      !/password|token|secret/i.test(name)
    )
      value = value.trim();
    if (field.uppercase && typeof value === "string")
      value = value.toUpperCase();
    if (field.emptyToNull && value === "") value = null;
    if (field.numericInput && value !== null && value !== undefined)
      value = numericInput(value);
    if (field.booleanInput) {
      if (value === true || value === "true" || value === "1" || value === 1)
        value = true;
      else if (
        value === false ||
        value === "false" ||
        value === "0" ||
        value === 0
      )
        value = false;
      else if (value === "" || value === null) value = undefined;
    }
    if (field.split && typeof value === "string")
      value = value.split(",").map((v) => v.trim());
    return value;
  }, schema);
}

export function getRequestSchema(name: string): z.ZodType {
  const existing = cache.get(name);
  if (existing) return existing;
  const contract = contracts[name];
  if (!contract) throw new Error(`Unknown request schema ${name}`);
  const shape: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(contract.fields))
    shape[key] = fieldSchema(key, field);
  const schema = z.strictObject(shape).superRefine((data, ctx) => {
    if (
      [
        "CreateFranchiseDto",
        "UpdateFranchiseDto",
        "CreateSalonDto",
        "UpdateSalonDto",
      ].includes(name) &&
      data.phone &&
      (typeof data.phone !== "string" || !isValidPhoneInput(data.phone))
    )
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter 10 local digits or a valid international phone number",
      });
    if (
      name === "CreateNotificationDto" &&
      data.channel === "EMAIL" &&
      !z.email().safeParse(data.recipient).success
    )
      ctx.addIssue({
        code: "custom",
        path: ["recipient"],
        message: "Enter a valid recipient email address",
      });
    if (name === "CreateBillItemDto") {
      const key =
        data.itemType === "SERVICE"
          ? "serviceId"
          : data.itemType === "PRODUCT"
            ? "productId"
            : null;
      if (key && !data[key])
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `Select a ${data.itemType === "SERVICE" ? "service" : "product"}`,
        });
      if (data.serviceId && data.productId)
        ctx.addIssue({
          code: "custom",
          path: ["productId"],
          message: "A bill item must reference exactly one service or product",
        });
    }
    if (
      name === "ProductRecipeDto" &&
      data.mode === "PERCENT" &&
      Number(data.value) > 100
    )
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Product usage percentage cannot exceed 100",
      });
    if (
      (name === "CreateServiceDto" || name === "UpdateServiceDto") &&
      Array.isArray(data.productRecipe)
    ) {
      const ids = data.productRecipe.map(
        (r: { productId?: string }) => r.productId,
      );
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: "custom",
          path: ["productRecipe"],
          message: "Select each recipe product only once",
        });
    }
    if (
      (name === "CreateProductDto" || name === "UpdateProductDto") &&
      data.measurementUnit === "PCS" &&
      data.packageSize !== undefined &&
      !Number.isInteger(data.packageSize)
    )
      ctx.addIssue({
        code: "custom",
        path: ["packageSize"],
        message: "Pieces per package must be a whole number",
      });
    if (
      typeof data.dateFrom === "string" &&
      typeof data.dateTo === "string" &&
      data.dateFrom > data.dateTo
    )
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "End date must be on or after the start date",
      });
    if (
      data.startDate &&
      data.endDate &&
      new Date(data.startDate as string).getTime() >
        new Date(data.endDate as string).getTime()
    )
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
  });
  cache.set(name, schema);
  return schema;
}

export const boundedInputSchema = z.unknown().superRefine((input, ctx) => {
  const walk = (value: unknown, depth: number, path: PropertyKey[]) => {
    const fail = (message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (depth > 12) {
      fail("Input exceeds the maximum nesting depth");
      return;
    }
    if (
      typeof value === "string" &&
      (value.length > 8192 || value.includes("\0"))
    )
      fail("Text is too long or contains invalid characters");
    if (typeof value === "number" && !Number.isFinite(value))
      fail("Enter a finite number");
    if (
      typeof value === "function" ||
      typeof value === "symbol" ||
      typeof value === "bigint"
    )
      fail("Invalid input type");
    if (value instanceof Date && !Number.isFinite(value.getTime()))
      fail("Enter a valid date");
    if (Array.isArray(value)) {
      if (value.length > 1000) {
        fail("Too many items");
        return;
      }
      value.forEach((item, i) => walk(item, depth + 1, [...path, i]));
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      const entries = Object.entries(value);
      if (entries.length > 200) {
        fail("Too many fields");
        return;
      }
      for (const [key, item] of entries) {
        if (["__proto__", "constructor", "prototype"].includes(key))
          fail("Unexpected request property");
        else walk(item, depth + 1, [...path, key]);
      }
    }
  };
  walk(input, 0, []);
});

export function validationError(error: z.ZodError): ApiError {
  const details = error.issues
    .slice(0, 10)
    .map((issue) =>
      issue.code === "unrecognized_keys"
        ? "Some submitted fields are not allowed. Refresh the page and try again."
        : `${issue.path.length ? `${issue.path.map((part) => (typeof part === "number" ? `Item ${part + 1}` : label(String(part)))).join(" → ")}: ` : ""}${issue.message}`,
    );
  return {
    status: 400,
    message: details[0] ?? "Check the form fields",
    details,
  };
}

const routes = generated.routes.map((route) => ({
  ...route,
  pattern: new RegExp(
    `^${route.path
      .split("/")
      .map((part) =>
        part.startsWith(":")
          ? "[^/]+"
          : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      )
      .join("/")}/?$`,
  ),
}));
export function validateRequestInput(
  method: string,
  url: string,
  input: unknown,
  kind: "body" | "query",
): unknown {
  const binary =
    (typeof FormData !== "undefined" && input instanceof FormData) ||
    (typeof Blob !== "undefined" && input instanceof Blob) ||
    input instanceof ArrayBuffer;
  if (binary) return input; // Upload content/size checks remain in upload handlers and on the server.
  const path = new URL(url, "http://validation.local").pathname.replace(
    /^\/api(?=\/)/,
    "",
  );
  const route = routes.find(
    (r) => r.method === method.toUpperCase() && r.pattern.test(path),
  );
  const name = route?.[kind as keyof typeof route];
  let value = input;
  if (
    kind === "body" &&
    typeof value === "string" &&
    typeof name === "string"
  ) {
    try {
      value = JSON.parse(value);
    } catch {
      throw {
        status: 400,
        message: "Request body must be valid JSON",
      } satisfies ApiError;
    }
  }
  const bounded = boundedInputSchema.safeParse(value);
  if (!bounded.success) throw validationError(bounded.error);
  if (typeof name !== "string") return value;
  const result = getRequestSchema(name).safeParse(value ?? {});
  if (!result.success) throw validationError(result.error);
  return result.data;
}

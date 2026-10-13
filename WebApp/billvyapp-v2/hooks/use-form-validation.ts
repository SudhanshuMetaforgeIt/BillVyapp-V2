"use client";
import { useCallback, useState } from "react";
import {
  boundedInputSchema,
  getRequestSchema,
  validationError,
} from "@/lib/validation/request-validation";

/** Validate raw form values, before Number()/parseInt() can erase invalid input. */
export function useFormValidation(dto: string, values: unknown) {
  const [attempted, setAttempted] = useState(false);
  const clear = useCallback(() => setAttempted(false), []);
  const result = boundedInputSchema
    .pipe(getRequestSchema(dto))
    .safeParse(values);
  const error = !result.success ? validationError(result.error) : null;
  return {
    valid: result.success,
    validate: () => {
      setAttempted(true);
      return result.success;
    },
    clear,
    messages: attempted ? (error?.details ?? []) : [],
    fieldError: (field: string) =>
      attempted && !result.success
        ? result.error.issues.find((issue) => issue.path[0] === field)?.message
        : undefined,
  };
}

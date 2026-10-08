"use client";
import { useState } from "react";
import { Modal } from "@/components/data/modal";
import {
  FormField,
  SelectInput,
  MutationError,
} from "@/components/data/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryAvailable, categoryLabel } from "./helpers";
import { useExpenseMutation } from "./hooks";
import { createCategory, updateCategory } from "./services";
import type { ExpenseCategory, CategoryPayload } from "./types";

export function CategoryDialog({
  businessId,
  category,
  categories,
  onClose,
}: {
  businessId: string;
  category?: ExpenseCategory;
  categories: ExpenseCategory[];
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const save = useExpenseMutation(
    (payload: CategoryPayload) =>
      category ? updateCategory(category.id, payload) : createCategory(payload),
    onClose,
    category ? "Category updated" : "Category created",
  );
  const parents = categories.filter((item) => {
    if (item.businessId !== businessId || !categoryAvailable(item, categories))
      return false;
    let current: ExpenseCategory | undefined = item;
    const seen = new Set<string>();
    while (current) {
      if (current.id === category?.id || seen.has(current.id)) return false;
      seen.add(current.id);
      current = categories.find((parent) => parent.id === current?.parentId);
    }
    return true;
  });
  return (
    <Modal
      open
      busy={save.isPending}
      onClose={onClose}
      title={category ? "Edit expense category" : "Add expense category"}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && businessId && !save.isPending)
            save.mutate({
              businessId,
              parentId: parentId || null,
              name: name.trim(),
              description: description.trim() || null,
            });
        }}
      >
        <fieldset disabled={save.isPending} className="space-y-4">
          <FormField id="expense-category-name" label="Name">
            <Input
              id="expense-category-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={191}
            />
          </FormField>
          <FormField id="expense-category-parent" label="Parent category">
            <SelectInput
              id="expense-category-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">No parent (top level)</option>
              {parents.map((item) => (
                <option key={item.id} value={item.id}>
                  {categoryLabel(item, categories)}
                </option>
              ))}
              {category?.parentId &&
                !parents.some((item) => item.id === category.parentId) && (
                  <option value={category.parentId}>
                    Current parent (inactive)
                  </option>
                )}
            </SelectInput>
          </FormField>
          <FormField
            id="expense-category-description"
            label="Description (optional)"
          >
            <Input
              id="expense-category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={10000}
            />
          </FormField>
        </fieldset>
        <MutationError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || !businessId || save.isPending}
          >
            {save.isPending ? "Saving…" : "Save category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

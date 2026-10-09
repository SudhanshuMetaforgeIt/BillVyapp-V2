"use client";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

import { SelectInput } from "@/components/data/form-fields";
const ProfilePhotoEditor = dynamic(
  () =>
    import("@/features/profile/components/profile-photo-editor").then(
      (module) => module.ProfilePhotoEditor,
    ),
  {
    loading: () => (
      <div
        role="status"
        aria-label="Loading profile photo"
        className="h-52 w-32 animate-pulse rounded-xl bg-surface"
      />
    ),
  },
);

import { useState } from "react";
import toast from "react-hot-toast";
import { Home, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";

import type {
  AddressType,
  Customer,
  CustomerAddress,
  CustomerAddressInput,
  Gender,
} from "@/types/models";
import {
  useDeleteAddress,
  useMyAddresses,
  useMyCustomer,
  useSaveAddress,
  useUpdateMyCustomer,
} from "../hooks/use-customer-portal";
import {
  CustomerCard,
  CustomerError,
  CustomerField,
  CustomerLoading,
  CustomerMutationError,
  CustomerPageTitle,
  CustomerPill,
  customerInput,
  customerOutlineButton,
  customerPrimaryButton,
} from "./customer-ui";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
  { value: "HOME", label: "Home" },
  { value: "WORK", label: "Work" },
  { value: "OTHER", label: "Other" },
];

function PersonalForm({ customer }: { customer: Customer }) {
  const update = useUpdateMyCustomer(customer.id);
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    dateOfBirth: customer.dateOfBirth?.slice(0, 10) ?? "",
    gender: customer.gender ?? "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: (form.gender || undefined) as Gender | undefined,
      },
      { onSuccess: () => toast.success("Profile updated") },
    );
  };

  return (
    <CustomerCard>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1C1E]">Personal details</h2>
          <span className="text-[11px] font-semibold text-[#8C8375]">
            {customer.customerCode}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <p
            id="cp-identity-note"
            className="text-xs text-[#8C8375] sm:col-span-2"
          >
            Email and phone changes require ownership verification and are
            currently unavailable.
          </p>
          <CustomerField label="First name" htmlFor="cp-first">
            <input
              id="cp-first"
              className={customerInput}
              value={form.firstName}
              onChange={set("firstName")}
              required
              maxLength={100}
            />
          </CustomerField>
          <CustomerField label="Last name" htmlFor="cp-last">
            <input
              id="cp-last"
              className={customerInput}
              value={form.lastName}
              onChange={set("lastName")}
              required
              maxLength={100}
            />
          </CustomerField>
          <CustomerField label="Email" htmlFor="cp-email">
            <input
              id="cp-email"
              type="email"
              className={customerInput}
              value={form.email}
              readOnly
              aria-describedby="cp-identity-note"
            />
          </CustomerField>
          <CustomerField label="Phone" htmlFor="cp-phone">
            <Input
              id="cp-phone"
              type="tel"
              className={customerInput}
              value={form.phone}
              readOnly
              aria-describedby="cp-identity-note"
            />
          </CustomerField>
          <CustomerField label="Date of birth" htmlFor="cp-dob">
            <input
              id="cp-dob"
              type="date"
              className={customerInput}
              value={form.dateOfBirth}
              onChange={set("dateOfBirth")}
            />
          </CustomerField>
          <CustomerField label="Gender" htmlFor="cp-gender">
            <SelectInput
              id="cp-gender"
              className={customerInput}
              value={form.gender}
              onChange={set("gender")}
            >
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </SelectInput>
          </CustomerField>
        </div>
        <CustomerMutationError error={update.error} />
        <div className="flex justify-end">
          <button
            type="submit"
            className={customerPrimaryButton}
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </CustomerCard>
  );
}

const EMPTY_ADDRESS: CustomerAddressInput = {
  addressType: "HOME",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  isDefault: false,
};

function AddressForm({
  customerId,
  address,
  onDone,
}: {
  customerId: string;
  address: CustomerAddress | null;
  onDone: () => void;
}) {
  const save = useSaveAddress(customerId);
  const [form, setForm] = useState<CustomerAddressInput>(
    address
      ? {
          addressType: address.addressType,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? "",
          city: address.city ?? "",
          state: address.state ?? "",
          country: address.country ?? "",
          postalCode: address.postalCode ?? "",
          isDefault: address.isDefault,
        }
      : EMPTY_ADDRESS,
  );
  const set =
    (key: keyof CustomerAddressInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (v: string | null | undefined) =>
      v?.trim() ? v.trim() : null;
    save.mutate(
      {
        id: address?.id,
        input: {
          addressType: form.addressType,
          addressLine1: form.addressLine1.trim(),
          addressLine2: clean(form.addressLine2),
          city: clean(form.city),
          state: clean(form.state),
          country: clean(form.country),
          postalCode: clean(form.postalCode),
          isDefault: form.isDefault,
        },
      },
      {
        onSuccess: () => {
          toast.success(address ? "Address updated" : "Address added");
          onDone();
        },
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-[#FFD099] bg-[#FFFAF3] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CustomerField label="Type" htmlFor="addr-type">
          <SelectInput
            id="addr-type"
            className={customerInput}
            value={form.addressType}
            onChange={set("addressType")}
          >
            {ADDRESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectInput>
        </CustomerField>
        <CustomerField label="Postal code" htmlFor="addr-postal">
          <input
            id="addr-postal"
            className={customerInput}
            value={form.postalCode ?? ""}
            onChange={set("postalCode")}
          />
        </CustomerField>
        <div className="sm:col-span-2">
          <CustomerField label="Address line 1" htmlFor="addr-line1">
            <input
              id="addr-line1"
              className={customerInput}
              value={form.addressLine1}
              onChange={set("addressLine1")}
              required
            />
          </CustomerField>
        </div>
        <div className="sm:col-span-2">
          <CustomerField label="Address line 2" htmlFor="addr-line2">
            <input
              id="addr-line2"
              className={customerInput}
              value={form.addressLine2 ?? ""}
              onChange={set("addressLine2")}
            />
          </CustomerField>
        </div>
        <CustomerField label="City" htmlFor="addr-city">
          <input
            id="addr-city"
            className={customerInput}
            value={form.city ?? ""}
            onChange={set("city")}
          />
        </CustomerField>
        <CustomerField label="State" htmlFor="addr-state">
          <input
            id="addr-state"
            className={customerInput}
            value={form.state ?? ""}
            onChange={set("state")}
          />
        </CustomerField>
        <CustomerField label="Country" htmlFor="addr-country">
          <input
            id="addr-country"
            className={customerInput}
            value={form.country ?? ""}
            onChange={set("country")}
          />
        </CustomerField>
        <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-[#4A453E]">
          <input
            type="checkbox"
            checked={Boolean(form.isDefault)}
            onChange={(e) =>
              setForm((f) => ({ ...f, isDefault: e.target.checked }))
            }
            className="size-4 accent-[#FF7B00]"
          />
          Default address
        </label>
      </div>
      <CustomerMutationError error={save.error} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={customerOutlineButton}
          onClick={onDone}
          disabled={save.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={customerPrimaryButton}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}

function AddressesSection({ customerId }: { customerId: string }) {
  const addresses = useMyAddresses(customerId);
  const remove = useDeleteAddress(customerId);
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const rows = addresses.data?.data ?? [];

  return (
    <CustomerCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1C1C1E]">Saved addresses</h2>
        {editing === null ? (
          <button
            type="button"
            className={customerOutlineButton}
            onClick={() => setEditing("new")}
          >
            <Plus className="size-3.5" />
            Add address
          </button>
        ) : null}
      </div>

      {editing === "new" ? (
        <AddressForm
          customerId={customerId}
          address={null}
          onDone={() => setEditing(null)}
        />
      ) : null}

      {addresses.isLoading ? (
        <CustomerLoading />
      ) : addresses.isError && !addresses.data ? (
        <CustomerError
          error={addresses.error}
          onRetry={() => void addresses.refetch()}
        />
      ) : rows.length === 0 && editing !== "new" ? (
        <p className="text-xs text-[#7D766C]">No saved addresses.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) =>
            editing !== null && editing !== "new" && editing.id === a.id ? (
              <li key={a.id}>
                <AddressForm
                  customerId={customerId}
                  address={a}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#F0EAE1] p-3"
              >
                <div className="flex gap-2">
                  {a.addressType === "HOME" ? (
                    <Home className="mt-0.5 size-4 text-[#FF7B00]" />
                  ) : (
                    <MapPin className="mt-0.5 size-4 text-[#FF7B00]" />
                  )}
                  <div className="text-xs text-[#4A453E]">
                    <p className="flex items-center gap-2 font-semibold text-[#1C1C1E]">
                      {
                        ADDRESS_TYPES.find((t) => t.value === a.addressType)
                          ?.label
                      }
                      {a.isDefault ? (
                        <CustomerPill label="Default" tone="success" />
                      ) : null}
                    </p>
                    <p>
                      {[a.addressLine1, a.addressLine2]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>
                      {[a.city, a.state, a.postalCode, a.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {confirmDelete === a.id ? (
                    <>
                      <button
                        type="button"
                        className={customerOutlineButton}
                        onClick={() => setConfirmDelete(null)}
                        disabled={remove.isPending}
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-[#B42318] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                        disabled={remove.isPending}
                        onClick={() =>
                          remove.mutate(a.id, {
                            onSuccess: () => {
                              toast.success("Address removed");
                              setConfirmDelete(null);
                            },
                          })
                        }
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      {!a.isDefault ? (
                        <SetDefaultButton customerId={customerId} address={a} />
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[#7D766C] hover:bg-[#FAF7F2] hover:text-[#1C1C1E]"
                        aria-label="Edit address"
                        onClick={() => setEditing(a)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[#7D766C] hover:bg-[#FEECEB] hover:text-[#B42318]"
                        aria-label="Delete address"
                        onClick={() => setConfirmDelete(a.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      <CustomerMutationError error={remove.error} />
    </CustomerCard>
  );
}

function SetDefaultButton({
  customerId,
  address,
}: {
  customerId: string;
  address: CustomerAddress;
}) {
  const save = useSaveAddress(customerId);
  return (
    <button
      type="button"
      className="rounded-lg p-1.5 text-[#7D766C] hover:bg-[#FFF3E5] hover:text-[#FF7B00] disabled:opacity-60"
      aria-label="Make default address"
      title="Make default"
      disabled={save.isPending}
      onClick={() =>
        save.mutate(
          {
            id: address.id,
            input: {
              addressType: address.addressType,
              addressLine1: address.addressLine1,
              isDefault: true,
            },
          },
          {
            onSuccess: () => toast.success("Default address updated"),
            onError: () => toast.error("Could not update the default address"),
          },
        )
      }
    >
      <Star className="size-3.5" />
    </button>
  );
}

export function ProfileView() {
  const me = useMyCustomer();

  return (
    <div className="space-y-6 pb-16">
      <CustomerPageTitle
        title="Profile"
        subtitle="Your details and saved addresses"
      />
      <CustomerCard>
        <ProfilePhotoEditor />
      </CustomerCard>
      {me.isLoading ? (
        <CustomerLoading label="Loading profile…" />
      ) : me.isError || !me.data ? (
        <CustomerError error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PersonalForm key={me.data.updatedAt} customer={me.data} />
          <AddressesSection customerId={me.data.id} />
        </div>
      )}
    </div>
  );
}

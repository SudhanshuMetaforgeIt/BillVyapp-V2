'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateBill } from '../hooks/use-bills';
import { api } from '@/services/api-client';

type CreateBillDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  customers: { id: string; name: string; phone?: string; customerCode?: string }[];
  services: { id: string; name: string; price: number; salonId: string }[];
};

type LineItem = {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export function CreateBillDialog({
  isOpen,
  onClose,
  branches,
  customers,
  services,
}: CreateBillDialogProps) {
  const createBillMutation = useCreateBill();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salonId, setSalonId] = useState(branches[0]?.id || '');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [billDate, setBillDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');

  // Quick Customer Creation inline if desired
  const [isNewCustomer, setIsNewCustomer] = useState(customers.length === 0);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Filter services by selected salon
  const salonServices = services.filter(
    (s) => !salonId || s.salonId === salonId,
  );

  // Line items state
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      serviceId: salonServices[0]?.id || services[0]?.id || '',
      name: salonServices[0]?.name || services[0]?.name || 'Standard Service',
      quantity: 1,
      unitPrice: salonServices[0]?.price || services[0]?.price || 500,
      discount: 0,
      taxRate: 18,
    },
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const s = salonServices[0] || services[0];
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        serviceId: s?.id || '',
        name: s?.name || 'Service',
        quantity: 1,
        unitPrice: s?.price || 500,
        discount: 0,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      if (field === 'serviceId') {
        const found = services.find((s) => s.id === value);
        copy[index] = {
          ...copy[index],
          serviceId: value as string,
          name: found?.name || copy[index].name,
          unitPrice: found?.price || copy[index].unitPrice,
        };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  // Compute Subtotal, Tax, Total
  const subtotal = items.reduce(
    (acc, it) => acc + (it.quantity * it.unitPrice - it.discount),
    0,
  );
  const taxAmount = items.reduce(
    (acc, it) =>
      acc +
      ((it.quantity * it.unitPrice - it.discount) * (it.taxRate / 100)),
    0,
  );
  const grandTotal = Math.round(subtotal + taxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) {
      setError('Please select a branch.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let targetCustomerId = customerId;

      // If user is adding a new customer inline
      if (isNewCustomer) {
        if (!newFirstName.trim() || !newPhone.trim()) {
          setError('First name and phone number are required for new customer.');
          setLoading(false);
          return;
        }

        const generatedEmail =
          newEmail.trim() ||
          `customer_${Date.now()}@billvy.dev`;

        const custRes = await api.post<{ id: string }>('/customers', {
          firstName: newFirstName.trim(),
          lastName: newLastName.trim() || 'Customer',
          phone: newPhone.trim().startsWith('+91')
            ? newPhone.trim()
            : `+91${newPhone.trim().replace(/^0+/, '')}`,
          email: generatedEmail,
        });

        targetCustomerId = custRes.id;
      }

      if (!targetCustomerId) {
        setError('Please select or create a customer.');
        setLoading(false);
        return;
      }

      // Format items for backend POST /bills
      const payloadItems = items.map((it) => ({
        itemType: 'SERVICE' as const,
        serviceId: it.serviceId || undefined,
        description: it.name,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        discount: Math.max(0, Number(it.discount) || 0),
        taxRate: Math.max(0, Number(it.taxRate) || 0),
      }));

      await createBillMutation.mutateAsync({
        salonId,
        customerId: targetCustomerId,
        billDate,
        notes: notes.trim() || undefined,
        items: payloadItems,
      });

      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to create bill. Please verify the branch and items.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              Create New Bill
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Raise a new draft bill for your customer across any branch.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Branch & Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Branch / Salon <span className="text-rose-500">*</span>
              </label>
              <select
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              >
                {branches.length === 0 ? (
                  <option value="">No branches found</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Bill Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
          </div>

          {/* Customer Selection */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Customer Information
              </span>
              <button
                type="button"
                onClick={() => setIsNewCustomer(!isNewCustomer)}
                className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
              >
                {isNewCustomer ? 'Select Existing Customer' : '+ New Customer'}
              </button>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required={isNewCustomer}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone (e.g. 9876543210) *"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required={isNewCustomer}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900"
                  />
                </div>
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              >
                {customers.length === 0 ? (
                  <option value="">No customers found — click + New Customer</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Services & Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 rounded-lg border border-stone-200/80 bg-stone-50/50 p-2.5 dark:border-stone-800 dark:bg-stone-800/40"
                >
                  <div className="flex-1 min-w-[140px]">
                    <select
                      value={it.serviceId}
                      onChange={(e) =>
                        handleItemChange(idx, 'serviceId', e.target.value)
                      }
                      className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                    >
                      {salonServices.length > 0 ? (
                        salonServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (₹{s.price})
                          </option>
                        ))
                      ) : services.length > 0 ? (
                        services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (₹{s.price})
                          </option>
                        ))
                      ) : (
                        <option value="">General Salon Service</option>
                      )}
                    </select>
                  </div>

                  <div className="w-16">
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'quantity',
                          Math.max(1, Number(e.target.value) || 1),
                        )
                      }
                      title="Qty"
                      placeholder="Qty"
                      className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-center dark:border-stone-700 dark:bg-stone-900"
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min={0}
                      value={it.unitPrice}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'unitPrice',
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                      title="Unit Price (₹)"
                      placeholder="Price"
                      className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-right dark:border-stone-700 dark:bg-stone-900"
                    />
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-stone-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Notes / Remarks (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special remarks or payment notes..."
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>

          {/* Pricing Breakdown */}
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 text-xs space-y-1.5 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Estimated Tax (18%):</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                ₹{Math.round(taxAmount).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-t border-stone-200/80 pt-1.5 flex justify-between text-sm font-bold text-stone-900 dark:text-white">
              <span>Grand Total:</span>
              <span className="text-amber-600 dark:text-amber-400">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create Bill
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

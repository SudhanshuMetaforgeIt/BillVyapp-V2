'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateCustomer } from '../hooks/use-customers';
import type { Gender } from '../types/customers.types';

type CreateCustomerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
};

export function CreateCustomerDialog({
  isOpen,
  onClose,
  branches,
}: CreateCustomerDialogProps) {
  const createCustomerMutation = useCreateCustomer();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('FEMALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [salonId, setSalonId] = useState(branches[0]?.id || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const generatedEmail =
        email.trim() ||
        `${firstName.toLowerCase().replace(/\s+/g, '')}.${Date.now()}@billvy.dev`;

      await createCustomerMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim() || 'Customer',
        phone: phone.trim(),
        email: generatedEmail,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        salonId: salonId || undefined,
      });

      onClose();
      // Reset form
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setDateOfBirth('');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to create customer. Phone or email might already exist.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              Add New Customer
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Register a new client profile across your franchise branches.
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
          {/* First & Last Name */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Amit"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kumar"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Email Address (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. amit@example.com"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
          </div>

          {/* Gender & DOB */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Date of Birth (optional)
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
          </div>

          {/* Preferred Branch */}
          {branches.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Preferred Branch Location
              </label>
              <select
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
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
              Save Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

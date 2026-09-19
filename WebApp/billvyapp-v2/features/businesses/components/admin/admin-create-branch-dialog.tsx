'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ADMIN_MY_BUSINESS_QUERY_KEY } from '../../hooks/use-admin-my-business';
import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-admin-dashboard';

type AdminCreateBranchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AdminCreateBranchDialog({ isOpen, onClose }: AdminCreateBranchDialogProps) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('560001');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.franchiseId) {
      setError('Franchise profile missing. Please log in with a valid franchise admin account.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post('/salons', {
        franchiseId: user.franchiseId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        country: 'India',
        postalCode: postalCode.trim(),
        latitude: 12.9716, // Bangalore central default
        longitude: 77.5946,
      });

      // Invalidate queries so tables refresh instantly
      await queryClient.invalidateQueries({ queryKey: ADMIN_MY_BUSINESS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY });

      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to create branch. Please verify fields and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-text">Add New Branch</h3>
            <p className="text-xs text-text-secondary">
              Register a new franchise branch location.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text">Branch Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. MG Road Branch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">Branch Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. BR01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text uppercase focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text">Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">Email</label>
              <input
                type="email"
                placeholder="branch@billvy.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text">Street Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. No. 12, Main Street"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">State *</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">Postal Code *</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange text-white hover:bg-brand-orange-dark"
            >
              {loading ? 'Creating…' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

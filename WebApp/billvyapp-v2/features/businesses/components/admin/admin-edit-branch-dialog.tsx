'use client';
import { Input } from '@/components/ui/input';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
  getSalon,
  geocodeSalon,
} from '@/features/salons/services/salons.service';
import { api } from '@/services/api-client';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { AdminBranchItem } from '../../types/admin-my-business.types';

type AdminEditBranchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  branch?: AdminBranchItem | null;
};

export function AdminEditBranchDialog({
  isOpen,
  onClose,
  branch,
}: AdminEditBranchDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (!isOpen || !branch) return;
    let cancelled = false;
    (async () => {
      try {
        const salon = await getSalon(branch.id);
        if (cancelled) return;
        setName(salon.name);
        setCode(salon.code);
        setPhone(salon.phone ?? '');
        setEmail(salon.email ?? '');
        setAddressLine1(salon.addressLine1);
        setCity(salon.city);
        setState(salon.state);
        setPostalCode(salon.postalCode);
        setError(null);
      } catch {
        if (cancelled) return;
        setName(branch.name);
        setCode(branch.code);
        setError(
          'Could not load full branch details. You can still edit basic fields.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, branch]);

  if (!isOpen || !branch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.patch(`/salons/${branch.id}`, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: 'India',
      });

      const geocodeAddress = [
        addressLine1.trim(),
        city.trim(),
        state.trim(),
        postalCode.trim(),
        'India',
      ]
        .filter(Boolean)
        .join(', ');
      await geocodeSalon(branch.id, { address: geocodeAddress }).catch(
        () => undefined,
      );

      await invalidateAfter(queryClient, 'salons');
      toast.success('Branch updated');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update branch.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="app-dialog relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-text">Edit Branch</h3>
            <p className="text-xs text-text-secondary">
              Update branch details and address.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light"
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
          <div className="grid grid-cols-1 gap-3 panel-md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text">
                Branch Name *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">
                Branch Code *
              </label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 panel-md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text">
                Phone
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text">
              Street Address *
            </label>
            <input
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text">
                City *
              </label>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">
                State *
              </label>
              <input
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">
                Postal Code *
              </label>
              <input
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-orange text-white hover:bg-brand-orange-dark"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

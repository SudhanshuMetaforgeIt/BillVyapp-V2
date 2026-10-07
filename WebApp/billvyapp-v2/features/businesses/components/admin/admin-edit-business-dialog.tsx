'use client';
import { Input } from '@/components/ui/input';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { AdminFranchiseOverview } from '../../types/admin-my-business.types';

type AdminEditBusinessDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  franchise?: AdminFranchiseOverview | null;
};

export function AdminEditBusinessDialog({
  isOpen,
  onClose,
  franchise,
}: AdminEditBusinessDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!isOpen || !franchise) return;
    setName(franchise.name);
    setCode(franchise.code);
    setPhone(franchise.phone ?? '');
    setEmail(franchise.email ?? '');
    setError(null);
  }, [isOpen, franchise]);

  if (!isOpen || !franchise) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.patch(`/franchises/${franchise.id}`, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      await invalidateAfter(queryClient, 'salons');
      toast.success('Business details updated');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update business details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="app-dialog relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-text">
              Edit Business Details
            </h3>
            <p className="text-xs text-text-secondary">
              Update franchise name, code, and contact information.
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
          <div>
            <label className="block text-xs font-semibold text-text">
              Business Name *
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
              Business Code *
            </label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm uppercase"
            />
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

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { AdminSupportTicket, ContactSupportPayload } from '../types/admin-support.types';

const TICKETS_STORAGE_KEY = 'billvy_admin_support_tickets_v2';

export function useAdminSupport() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (stored) {
        setTickets(JSON.parse(stored));
      }
    } catch {
      // Ignore JSON parse errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const createTicket = (payload: ContactSupportPayload) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const ticketNumber = `#TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: AdminSupportTicket = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ticketNumber,
      fullName: payload.fullName,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
      status: 'Open',
      createdAt: formattedDate,
      lastUpdated: formattedDate,
    };

    setTickets((prev) => {
      const next = [newTicket, ...prev];
      try {
        localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // LocalStorage quota or disabled
      }
      return next;
    });

    toast.success(`Support ticket ${ticketNumber} submitted!`);
    return newTicket;
  };

  return {
    tickets,
    isLoaded,
    createTicket,
  };
}

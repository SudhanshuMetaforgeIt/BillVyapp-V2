'use client';

import React, { useState } from 'react';
import { ChevronRight, X, Clock, User, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminSupportTicket } from '../../types/admin-support.types';

type Props = {
  tickets: AdminSupportTicket[];
};

export function AdminRecentTicketsCard({ tickets }: Props) {
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);

  return (
    <>
      <div className="rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-5">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Recent Support Tickets
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Track the status of your recent support requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (tickets.length > 0) setSelectedTicket(tickets[0]);
            }}
            className="flex items-center text-xs font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 transition-colors"
          >
            View All Tickets <ChevronRight className="ml-0.5 h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-stone-700 dark:border-stone-800 dark:text-stone-300 font-bold">
                <th className="pb-3 font-bold">Ticket ID</th>
                <th className="pb-3 font-bold">Subject</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 font-bold">Last Updated</th>
                <th className="pb-3 text-right font-bold pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400 dark:text-stone-500">
                    No support tickets submitted yet. Use the form above to raise an issue.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition-colors hover:bg-stone-50/50 dark:hover:bg-stone-800/40"
                  >
                    <td className="py-4 font-semibold text-stone-900 dark:text-white">
                      {ticket.ticketNumber}
                    </td>
                    <td className="py-4 font-medium text-stone-800 dark:text-stone-200">
                      {ticket.subject}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 text-stone-500 dark:text-stone-400">
                      {ticket.lastUpdated}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                        className="h-7 rounded-lg border-amber-500/80 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Dialog */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    {selectedTicket.ticketNumber}
                  </h3>
                  <span className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                    {selectedTicket.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {selectedTicket.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <User className="h-3.5 w-3.5 text-stone-400" />
                  <span>{selectedTicket.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  <span className="truncate">{selectedTicket.email}</span>
                </div>
                <div className="col-span-2 flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <Clock className="h-3.5 w-3.5 text-stone-400" />
                  <span>Last Updated: {selectedTicket.lastUpdated}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                  Ticket Message
                </label>
                <div className="mt-1.5 rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40 text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
              <Button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-200 dark:text-stone-900 text-xs"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

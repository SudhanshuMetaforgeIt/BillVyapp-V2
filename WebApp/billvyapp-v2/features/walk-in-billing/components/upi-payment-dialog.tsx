"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/data/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { api } from "@/services/api-client";
import { createUuid } from "@/lib/uuid";
import { invalidateAfter } from "@/lib/query-invalidation";
import { describeApiError } from "@/lib/api-errors";
import { recordCounterPayment } from "@/features/bills/services/bill-records.service";
import type { BillRecord } from "../types/walk-in-billing.types";

type UpiQr = {
  billId: string;
  billNumber: string;
  shopName: string;
  upiId: string;
  amount: string;
  currency: "INR";
  qrDataUrl: string;
};
export function UpiPaymentDialog({
  bill,
  onClose,
}: {
  bill: Pick<BillRecord, "id" | "billNumber">;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [reference, setReference] = useState("");
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [key] = useState(createUuid);
  const qr = useScopedQuery(
    ["bill-upi", bill.id],
    () => api.get<UpiQr>(`/bills/${bill.id}/upi-payment`),
    { staleTime: 0, refetchOnWindowFocus: false, retry: false },
  );
  const confirm = useMutation({
    mutationFn: () => {
      if (!qr.data || !receiptChecked)
        throw new Error("Verify receipt in the shop’s account first");
      return recordCounterPayment({
        billId: bill.id,
        amount: Number(qr.data.amount),
        currency: "INR",
        paymentMethod: "UPI",
        idempotencyKey: key,
        transactionReference: reference.trim() || null,
      });
    },
    onSuccess: () => {
      void invalidateAfter(client, "payments");
      toast.success("Payment received and recorded");
      onClose();
    },
  });
  return (
    <Modal
      open
      onClose={onClose}
      busy={confirm.isPending}
      title="UPI payment"
      description={`Bill ${bill.billNumber}`}
    >
      <div className="space-y-4">
        {qr.isPending ? (
          <p role="status">Preparing payment QR…</p>
        ) : qr.isError ? (
          <div role="alert">
            <p>{describeApiError(qr.error).message}</p>
            <Button onClick={() => void qr.refetch()}>Retry QR</Button>
            <p className="mt-2 text-sm">
              This bill remains unpaid. You can collect it later from Bills.
            </p>
          </div>
        ) : qr.data ? (
          <>
            <div className="text-center">
              <p className="font-semibold">{qr.data.shopName}</p>
              <p className="break-all text-sm">{qr.data.upiId}</p>
              <p className="mt-2 text-2xl font-bold">₹{qr.data.amount}</p>
              {/* Backend-generated PNG data URI; no third-party QR image service. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.data.qrDataUrl}
                width={320}
                height={320}
                alt={`Scan to pay ₹${qr.data.amount} to ${qr.data.shopName}`}
                className="mx-auto max-w-full"
              />
              <p className="text-sm text-text-secondary">
                Scan with your UPI app. The bill stays unpaid until staff
                confirms receipt.
              </p>
            </div>
            <label className="block text-sm">
              UPI transaction reference (optional)
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={191}
                disabled={confirm.isPending || confirm.isError}
                placeholder="Reference from the received payment"
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={receiptChecked}
                onChange={(event) => setReceiptChecked(event.target.checked)}
                disabled={confirm.isPending}
              />
              I verified this amount was received in the shop’s UPI account.
            </label>
            {confirm.isError && (
              <p role="alert" className="text-sm text-danger">
                {describeApiError(confirm.error).message}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!receiptChecked || confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending ? "Recording…" : "Payment received"}
            </Button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Printer } from "lucide-react";
import talariaLogo from "../image/logo.svg";
import { flagSrc } from "../utils/flags";

interface ContactInfo {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
}

interface Shipment {
  trackingId: string;
  origin: string;
  destination: string;
  status: string;
  expectedDelivery: string;
  truckType?: string;
  createdAt?: string;
  weight?: number;
  price?: number;
  service?: string;
  servicePrice?: number;
  insuranceFee?: number;
  paymentMethod?: string;
  sender?: ContactInfo;
  recipient?: ContactInfo;
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fullAddress = (c?: ContactInfo) =>
  c
    ? [c.street, c.city, c.state].filter(Boolean).join(", ") || "—"
    : "—";

// Extract the state name from a location string like "123 Main St, St Louis, Missouri".
const locationLabel = (value?: string): string => {
  const v = (value ?? "").trim();
  if (!v) return v;
  const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return v;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (flagSrc(part)) return part;
  }
  return parts[parts.length - 1];
};

const RouteFlags = ({ origin, destination }: { origin?: string; destination?: string }) => {
  const o = locationLabel(origin);
  const d = locationLabel(destination);
  const oSrc = flagSrc(o);
  const dSrc = flagSrc(d);
  return (
    <div className="flex items-center gap-3 text-neutral-700">
      <span className="flex items-center gap-1.5">
        {oSrc && (
          <img
            src={oSrc}
            alt=""
            className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm"
          />
        )}
        <span className="font-semibold">{o || "—"}</span>
      </span>
      <ArrowRight size={14} className="text-neutral-300" />
      <span className="flex items-center gap-1.5">
        {dSrc && (
          <img
            src={dSrc}
            alt=""
            className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm"
          />
        )}
        <span className="font-semibold">{d || "—"}</span>
      </span>
    </div>
  );
};

// Itemized line items — mirrors the Order Summary from the booking flow
// (service + insurance) when the rate was stored, otherwise falls back to an
// estimate for legacy shipments.
const lineItems = (s: Shipment) => {
  const wt = s.weight || 0;
  if (s.price && s.price > 0) {
    const items: { description: string; qty: number; rate: number }[] = [];
    if (s.servicePrice && s.servicePrice > 0)
      items.push({
        description: `${s.service || "Freight"} — ${s.truckType || "Dry Van"}`,
        qty: 1,
        rate: s.servicePrice,
      });
    else
      items.push({
        description: `Freight — ${s.truckType || "Dry Van"}${
          wt > 0 ? ` · ${wt} kg` : ""
        }`,
        qty: 1,
        rate: s.price,
      });
    if (s.insuranceFee && s.insuranceFee > 0)
      items.push({ description: "Insurance", qty: 1, rate: s.insuranceFee });
    return items;
  }
  const base = 49.0;
  const rate = 0.95;
  const items = [
    { description: `Base freight — ${s.truckType || "Dry Van"}`, qty: 1, rate: base },
    { description: `Fuel & dispatch`, qty: 1, rate: 24 },
  ];
  if (wt > 0) {
    items.splice(1, 0, { description: `Weight charge (${wt} kg)`, qty: wt, rate });
  }
  return items;
};

export default function Invoice({
  variant = "invoice",
}: {
  variant?: "invoice" | "receipt";
}) {
  const receipt = variant === "receipt";
  const { trackingId } = useParams();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!trackingId) return;
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/shipments/${trackingId}`
        );
        if (!res.ok) {
          setNotFound(res.status === 404);
          throw new Error(`Failed to load shipment (${res.status})`);
        }
        const data = await res.json();
        setShipment(data);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice.");
      } finally {
        setLoading(false);
      }
    })();
  }, [trackingId]);

  if (loading) {
    return (
      <div className="p-8 text-white">
        <div className="mx-auto max-w-3xl animate-pulse rounded-xl bg-[#18181B] p-8 text-neutral-400">
          Loading invoice…
        </div>
      </div>
    );
  }

  if (notFound || !shipment) {
    return (
      <div className="p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-[#27272A] bg-[#121212] p-8 text-center">
          <p className="text-lg font-semibold">Invoice not found</p>
          <p className="mt-1 text-sm text-[#A1A1AA]">{error}</p>
          <Link
            to="/orders"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
          >
            <ArrowLeft size={15} /> Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const items = lineItems(shipment);
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.rate, 0);
  const tax = 0;
  const total = subtotal + tax;
  const issueDate = shipment.createdAt
    ? new Date(shipment.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to orders
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>

        {/* Printable invoice */}
        <div className="overflow-hidden rounded-xl border border-[#27272A] bg-white text-neutral-900 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-5">
            <div className="flex items-start gap-3">
              <img src={talariaLogo} alt="Talaria" className="h-12 w-12" />
              <div>
                <p className="text-lg font-semibold tracking-tight text-neutral-900">
                  Talaria <span className="text-neutral-500">Freight</span>
                </p>
                <p className="text-xs text-neutral-500">
                  Safe parcel &amp; freight deliveries · 48-state coverage · live tracked
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  support@talaria.co.in · talaria.co.in · Swift, secure &amp; tamper-free
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight">
                {receipt ? "RECEIPT" : "INVOICE"}
              </p>
              <p className="mt-1 font-mono text-sm text-neutral-700">
                {shipment.trackingId}
              </p>
              <p className="text-xs text-neutral-500">Issued {issueDate}</p>
            </div>
          </div>

          {/* Route flags */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-6 py-3 text-xs">
            <RouteFlags origin={shipment.origin} destination={shipment.destination} />
            <span className="text-neutral-400">
              {shipment.truckType || "Dry Van"}
              {shipment.weight ? ` · ${shipment.weight} kg` : ""}
            </span>
          </div>

          {/* Addresses */}
          <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Bill from · Sender
              </p>
              <p className="mt-1.5 text-sm font-semibold text-neutral-900">
                {shipment.sender?.contactName ||
                  shipment.sender?.name ||
                  "—"}
              </p>
              <p className="text-sm text-neutral-600">
                {fullAddress(shipment.sender)}
              </p>
              <p className="text-sm text-neutral-600">
                {shipment.sender?.email || ""}
                {shipment.sender?.phone
                  ? ` · ${shipment.sender.phone}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Bill to · Recipient
              </p>
              <p className="mt-1.5 text-sm font-semibold text-neutral-900">
                {shipment.recipient?.contactName ||
                  shipment.recipient?.name ||
                  "—"}
              </p>
              <p className="text-sm text-neutral-600">
                {fullAddress(shipment.recipient)}
              </p>
              <p className="text-sm text-neutral-600">
                {shipment.recipient?.email || ""}
                {shipment.recipient?.phone
                  ? ` · ${shipment.recipient.phone}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto px-6 pb-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-neutral-200 bg-neutral-50 text-left text-[11px] uppercase tracking-widest text-neutral-500">
                  <th className="py-2 pr-4 font-semibold">Description</th>
                  <th className="py-2 pr-4 font-semibold">Qty</th>
                  <th className="py-2 pr-4 text-right font-semibold">Rate</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.description} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-neutral-800">{it.description}</td>
                    <td className="py-2 pr-4 text-neutral-600">{it.qty}</td>
                    <td className="py-2 pr-4 text-right text-neutral-600">
                      {money(it.rate)}
                    </td>
                    <td className="py-2 text-right font-medium text-neutral-900">
                      {money(it.qty * it.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1 px-6 py-4 sm:px-6">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Tax</span>
                <span>{money(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} /> {receipt ? "Amount paid" : "Payment status"}: PAID
              {shipment.paymentMethod ? ` · ${shipment.paymentMethod}` : ""}
            </div>
          </div>

          <div className="border-t border-neutral-200 px-6 py-4 text-center text-xs text-neutral-400">
            {receipt ? "Receipt" : "Invoice"} for shipment {shipment.trackingId} ·
            Estimated delivery{" "}
            {shipment.expectedDelivery
              ? new Date(shipment.expectedDelivery).toLocaleDateString("en-US")
              : "—"}
            <br />
            Talaria Freight — thank you for shipping with us.
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

// Inbound container entry + per-shipment actions. Manual entry is the v1
// intake; the ops pipeline may automate creation later.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createInboundShipmentAction,
  deleteInboundShipmentAction,
  markInboundReceivedAction,
  updateInboundShipmentAction,
} from "@/actions/admin-inbound";

const inputStyle: React.CSSProperties = {
  height: 32,
  border: "1px solid var(--char)",
  background: "white",
  padding: "0 10px",
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 12,
  color: "var(--ink)",
  borderRadius: 0,
};

interface SkuOption {
  vendorProductId: string;
  sku: string;
  description: string;
}

interface LineDraft {
  vendorProductId: string;
  qty: string;
}

export function NewShipmentForm({
  vendors,
  skus,
}: {
  vendors: Array<{ id: string; name: string }>;
  skus: SkuOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ vendorProductId: "", qty: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLine(i: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function submit() {
    setError(null);
    const parsed = lines
      .filter((l) => l.vendorProductId || l.qty)
      .map((l) => ({ vendorProductId: l.vendorProductId, qtyCases: Number(l.qty) }));
    if (parsed.length === 0) {
      setError("Add at least one line");
      return;
    }
    for (const l of parsed) {
      if (!l.vendorProductId) {
        setError("Every line needs a SKU");
        return;
      }
      if (!Number.isInteger(l.qtyCases) || l.qtyCases <= 0) {
        setError("Case quantities must be whole numbers above 0");
        return;
      }
    }
    if (etd && eta && eta <= etd) {
      setError("ETA must be after ETD");
      return;
    }
    setBusy(true);
    const res = await createInboundShipmentAction({
      vendorId: vendorId || null,
      poNumber: poNumber || null,
      containerNo: containerNo || null,
      etd: etd || null,
      eta: eta || null,
      notes: notes || null,
      lines: parsed,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Save failed");
      return;
    }
    setOpen(false);
    setVendorId("");
    setPoNumber("");
    setContainerNo("");
    setEtd("");
    setEta("");
    setNotes("");
    setLines([{ vendorProductId: "", qty: "" }]);
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        kind="secondary"
        className="btn-sm"
        style={{ alignSelf: "flex-start" }}
        onClick={() => setOpen(true)}
      >
        New shipment
      </Button>
    );
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--rule)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="t-eyebrow">New inbound shipment</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">Vendor</span>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">PO number</span>
          <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} style={inputStyle} />
        </label>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">Container</span>
          <input value={containerNo} onChange={(e) => setContainerNo(e.target.value)} style={inputStyle} />
        </label>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">ETD</span>
          <input type="date" value={etd} onChange={(e) => setEtd(e.target.value)} style={inputStyle} />
        </label>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">ETA</span>
          <input type="date" value={eta} onChange={(e) => setEta(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div className="flex flex-col" style={{ gap: 6 }}>
        <span className="t-eyebrow">Lines</span>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 32px", gap: 8 }}>
            <select
              value={l.vendorProductId}
              onChange={(e) => setLine(i, { vendorProductId: e.target.value })}
              style={inputStyle}
              aria-label={`Line ${i + 1} SKU`}
            >
              <option value="">SKU…</option>
              {skus.map((s) => (
                <option key={s.vendorProductId} value={s.vendorProductId}>
                  {s.sku} · {s.description.slice(0, 48)}
                </option>
              ))}
            </select>
            <input
              inputMode="numeric"
              placeholder="cases"
              value={l.qty}
              onChange={(e) => setLine(i, { qty: e.target.value.replace(/[^0-9]/g, "") })}
              style={{ ...inputStyle, textAlign: "right" }}
              aria-label={`Line ${i + 1} cases`}
            />
            <button
              type="button"
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
              disabled={lines.length === 1}
              style={{ ...inputStyle, cursor: "pointer", padding: 0 }}
              aria-label={`Remove line ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-text"
          style={{ height: 28, alignSelf: "flex-start", padding: 0, fontSize: 11 }}
          onClick={() => setLines((ls) => [...ls, { vendorProductId: "", qty: "" }])}
        >
          + Add line
        </button>
      </div>

      <label className="flex flex-col" style={{ gap: 4 }}>
        <span className="t-eyebrow">Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
      </label>

      {error ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--burgundy)" }}>
          {error}
        </div>
      ) : null}

      <div className="flex" style={{ gap: 8 }}>
        <Button kind="primary" className="btn-sm" onClick={() => void submit()} disabled={busy}>
          {busy ? "Saving…" : "Save shipment"}
        </Button>
        <Button kind="secondary" className="btn-sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ShipmentActions({
  shipmentId,
  poNumber,
  containerNo,
  etd,
  eta,
  status,
  notes,
}: {
  shipmentId: string;
  poNumber: string | null;
  containerNo: string | null;
  etd: string | null;
  eta: string | null;
  status: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    poNumber: poNumber ?? "",
    containerNo: containerNo ?? "",
    etd: etd ?? "",
    eta: eta ?? "",
    status,
    notes: notes ?? "",
  });

  async function markReceived() {
    if (!window.confirm("Mark this shipment as received?")) return;
    setBusy(true);
    setError(null);
    const res = await markInboundReceivedAction({ shipmentId });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed");
      return;
    }
    if (res.receiptDetected === false) {
      setNote("no matching receipt jump in the snapshot yet");
      setTimeout(() => router.refresh(), 2200);
    } else {
      router.refresh();
    }
  }

  async function remove() {
    if (!window.confirm("Delete this shipment? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    const res = await deleteInboundShipmentAction({ shipmentId });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  async function saveEdit() {
    setBusy(true);
    setError(null);
    const res = await updateInboundShipmentAction({
      shipmentId,
      poNumber: form.poNumber || null,
      containerNo: form.containerNo || null,
      etd: form.etd || null,
      eta: form.eta || null,
      status: form.status,
      notes: form.notes || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Failed");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {editing ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
          <input
            placeholder="PO"
            value={form.poNumber}
            onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
            style={inputStyle}
            aria-label="PO number"
          />
          <input
            placeholder="Container"
            value={form.containerNo}
            onChange={(e) => setForm({ ...form, containerNo: e.target.value })}
            style={inputStyle}
            aria-label="Container number"
          />
          <input
            type="date"
            value={form.etd}
            onChange={(e) => setForm({ ...form, etd: e.target.value })}
            style={inputStyle}
            aria-label="ETD"
          />
          <input
            type="date"
            value={form.eta}
            onChange={(e) => setForm({ ...form, eta: e.target.value })}
            style={inputStyle}
            aria-label="ETA"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            style={inputStyle}
            aria-label="Status"
          >
            <option value="ordered">ordered</option>
            <option value="on_water">on water</option>
            <option value="arrived">arrived</option>
          </select>
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={inputStyle}
            aria-label="Notes"
          />
        </div>
      ) : null}

      <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
        {editing ? (
          <>
            <Button kind="primary" className="btn-sm" onClick={() => void saveEdit()} disabled={busy}>
              Save
            </Button>
            <Button kind="secondary" className="btn-sm" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button kind="secondary" className="btn-sm" onClick={() => setEditing(true)} disabled={busy}>
              Edit
            </Button>
            <Button kind="secondary" className="btn-sm" onClick={() => void markReceived()} disabled={busy}>
              Mark received
            </Button>
            <Button kind="secondary" className="btn-sm" onClick={() => void remove()} disabled={busy}>
              Delete
            </Button>
          </>
        )}
      </div>

      {note ? (
        <div className="t-micro" style={{ color: "var(--warm)" }}>
          {note}
        </div>
      ) : null}
      {error ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--burgundy)" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

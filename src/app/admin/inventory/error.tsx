"use client";

// Route-group error boundary: the standard white card with a retry link.

export default function InventoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--rule)",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div className="mono t-cap">Inventory data could not be loaded.</div>
      <button
        type="button"
        onClick={reset}
        className="btn btn-secondary btn-sm"
        style={{ marginTop: 14 }}
      >
        Retry
      </button>
    </section>
  );
}

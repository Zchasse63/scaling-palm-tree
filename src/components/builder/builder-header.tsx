"use client";

// Sticky header above the builder workspace.
// Center column shows the active vendor catalog; clickable on multi-catalog accounts
// to swap (preserving the current draft state would require URL state — for now
// switching navigates through /catalogs).

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { Caret } from "@/components/ui/caret";
import { Chip } from "@/components/ui/chip";
import { CONTAINERS } from "@/lib/containers";
import type { CatalogSummary, VendorCatalog } from "@/lib/catalog/types";
import type { CatalogStatusByVendorId } from "@/lib/catalog/status";

interface BuilderHeaderProps {
  catalog: VendorCatalog;
  customerName: string;
  otherCatalogs: CatalogSummary[];
  otherCatalogStatus?: CatalogStatusByVendorId;
}

function relativeDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function BuilderHeader({
  catalog,
  customerName,
  otherCatalogs,
  otherCatalogStatus = {},
}: BuilderHeaderProps) {
  const containerLabel = CONTAINERS[catalog.containerCode]?.label ?? catalog.containerCode;
  const [open, setOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  // Compare by vendorId internally but never show vendor identity to the customer.
  const others = otherCatalogs.filter((c) => c.vendorId !== catalog.vendorId);

  // Click-outside to close popovers.
  const switcherRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) {
        setAcctOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--ink)",
        color: "white",
        borderBottom: "1px solid var(--char)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          height: 76,
          padding: "0 32px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
        }}
      >
        <div className="flex items-center" style={{ gap: 14 }}>
          <Wordmark height={32} />
        </div>
        <div
          ref={switcherRef}
          className="flex flex-col"
          style={{
            alignItems: "center",
            textAlign: "center",
            lineHeight: 1.2,
            position: "relative",
          }}
        >
          <div className="t-eyebrow" style={{ color: "var(--warm)" }}>Container Builder</div>
          <div
            className="flex items-center"
            style={{
              gap: 6,
              marginTop: 2,
              cursor: others.length ? "pointer" : "default",
              color: "white",
            }}
            onClick={() => others.length && setOpen((v) => !v)}
          >
            <div className="t-sub" style={{ fontSize: 17, color: "white" }}>
              {catalog.displayName}
            </div>
            {others.length > 0 ? <Caret /> : null}
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--warm)", marginTop: 2 }}
          >
            {containerLabel} · {catalog.termsLabel} · {catalog.currency}
          </div>
          {open && others.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: 60,
                background: "white",
                border: "1px solid var(--char)",
                minWidth: 320,
                zIndex: 40,
                textAlign: "left",
              }}
            >
              <div
                className="t-eyebrow"
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                Switch catalog
              </div>
              {others.map((o) => {
                const status = otherCatalogStatus[o.vendorId] ?? {};
                const lastOrderRel = relativeDate(status.lastOrderAt);
                return (
                  <Link
                    key={o.vendorId}
                    href={{ pathname: "/", query: { c: o.slug } }}
                    className="row-hover"
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--rule)",
                      display: "flex",
                      flexDirection: "column",
                      textDecoration: "none",
                      color: "inherit",
                      gap: 4,
                    }}
                    onClick={() => setOpen(false)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="t-body" style={{ fontWeight: 500 }}>
                        {o.displayName}
                      </span>
                      {status.hasDraft ? (
                        <Chip variant="ink">
                          Draft · {status.draftCases} cs
                        </Chip>
                      ) : null}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "var(--mid)" }}
                    >
                      {(CONTAINERS[o.containerCode]?.label ?? o.containerCode)} · {o.termsLabel}
                      {lastOrderRel ? (
                        <span style={{ color: "var(--warm)" }}>
                          {" "}· last order {lastOrderRel}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
        <div
          ref={acctRef}
          className="flex items-center"
          style={{
            gap: 8,
            justifyContent: "flex-end",
            position: "relative",
          }}
        >
          <div className="flex flex-col" style={{ alignItems: "flex-end", lineHeight: 1.2 }}>
            <div className="t-body" style={{ fontWeight: 500, color: "white" }}>{customerName}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--warm)" }}>
              Servous customer
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAcctOpen((v) => !v)}
            style={{
              background: "transparent",
              border: "1px solid var(--mid)",
              color: "white",
              height: 32,
              width: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Account menu"
          >
            <Caret />
          </button>
          {acctOpen ? (
            <div
              style={{
                position: "absolute",
                top: 60,
                right: 0,
                background: "white",
                border: "1px solid var(--char)",
                minWidth: 200,
                zIndex: 40,
              }}
            >
              <Link
                href="/"
                className="row-hover"
                style={{
                  padding: "10px 14px",
                  display: "block",
                  borderBottom: "1px solid var(--rule)",
                  textDecoration: "none",
                  color: "inherit",
                }}
                onClick={() => setAcctOpen(false)}
              >
                Switch catalog
              </Link>
              <Link
                href="/orders"
                className="row-hover"
                style={{
                  padding: "10px 14px",
                  display: "block",
                  borderBottom: "1px solid var(--rule)",
                  textDecoration: "none",
                  color: "inherit",
                }}
                onClick={() => setAcctOpen(false)}
              >
                Order history
              </Link>
              <form
                method="POST"
                action="/signout"
                style={{ display: "block" }}
              >
                <button
                  type="submit"
                  className="row-hover"
                  style={{
                    padding: "10px 14px",
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

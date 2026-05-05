// Number formatters used throughout the UI.

export function fmtMoney(n: number, currency = "USD"): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const symbol = currency === "USD" ? "$" : "";
  return (
    sign +
    symbol +
    abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtMoneyPos(n: number, currency = "USD"): string {
  return fmtMoney(Math.max(0, n), currency);
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmt1(n: number): string {
  return n.toFixed(1);
}

export function fmt2(n: number): string {
  return n.toFixed(2);
}

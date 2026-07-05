export function formatINR(n: number | undefined | null): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatIndex(n: number | undefined | null): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatPct(n: number | undefined | null, fixed = 2): string {
  const v = Number(n || 0);
  return `${v >= 0 ? "+" : ""}${v.toFixed(fixed)}%`;
}

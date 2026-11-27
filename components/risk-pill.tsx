import { OPERATIONAL_PRIOR_NOTE, topReasons, type RiskResult } from "@/lib/risk";

const STYLE = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  high: "border-red-200 bg-red-50 text-red-800",
  closed: "border-slate-200 bg-slate-100 text-slate-600",
} as const;

export function RiskPill({ risk }: { risk: RiskResult }) {
  const label = risk.band === "closed" ? "Closed" : `${Math.round(risk.p * 100)}%`;
  const why = risk.band === "closed" ? "Closed cases are excluded from the dropout ranking." : topReasons(risk);
  return (
    <span title={`${why} ${OPERATIONAL_PRIOR_NOTE}`} className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${STYLE[risk.band]}`}>
      {label}
    </span>
  );
}

"use client";

import { useDemo } from "@/components/providers";
import { FACILITIES } from "@/lib/facilities";

export function ClinicFilter() {
  const { clinicId, setClinicId, locale } = useDemo();
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{locale === "ar" ? "العيادة" : "Clinic"}</span>
      <select aria-label="Clinic" className="bg-transparent font-semibold outline-none" value={clinicId} onChange={(event) => setClinicId(event.target.value)}>
        <option value="all">{locale === "ar" ? "كل العيادات" : "All Abu Dhabi clinics"}</option>
        {FACILITIES.map((facility) => <option key={facility.id} value={facility.id}>{facility.short}</option>)}
      </select>
    </label>
  );
}

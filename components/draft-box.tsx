"use client";

import { useDemo } from "@/components/providers";
import type { DraftKind, DraftSource } from "@/lib/draft";
import { useState } from "react";

export function DraftBox({ caseId, kind, label }: { caseId: string; kind: DraftKind; label: string }) {
  const { recordDraftApproval } = useDemo();
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [source, setSource] = useState<DraftSource | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestDraft(next: "en" | "ar") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId, kind, language: kind === "sbar" ? "en" : next }),
      });
      const body = (await response.json()) as { text?: string; source?: DraftSource; error?: string };
      if (!response.ok || !body.text || !body.source) {
        setError(body.error ?? "Draft unavailable.");
        setSource(null);
      } else {
        setText(body.text);
        setSource(body.source);
      }
    } catch {
      setError("Draft unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const rtl = kind === "teachback" && language === "ar";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800" onClick={() => requestDraft(language)} disabled={busy}>
          {busy ? "Drafting…" : label}
        </button>
        {kind === "teachback" ? (
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold">
            {(["en", "ar"] as const).map((item) => (
              <button key={item} type="button" className={`rounded-md px-2 py-1 ${language === item ? "bg-slate-900 text-white" : "text-slate-700"}`} onClick={() => { setLanguage(item); if (source) void requestDraft(item); }}>
                {item === "en" ? "EN" : "AR"}
              </button>
            ))}
          </div>
        ) : null}
        {source ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950">
            {source === "llm" ? "AI draft · review before use" : "Template draft"}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-red-800">{error}</p> : null}
      {source ? (
        <div className="mt-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            dir={rtl ? "rtl" : "ltr"}
            lang={rtl ? "ar" : "en"}
            className={`min-h-36 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 ${rtl ? "font-arabic" : ""}`}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => {
                recordDraftApproval(caseId, source, text);
                setSource(null);
                setText("");
              }}
            >
              Approve & save to record (simulated)
            </button>
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800" onClick={() => { setSource(null); setText(""); }}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

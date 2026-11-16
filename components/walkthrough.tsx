"use client";

import { useDemo } from "@/components/providers";
import { TOUR_UI, spotlightBox, tooltipPosition, tourSteps, type Box, type TourUi } from "@/lib/walkthrough";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const HIDE_KEY = "baton-walkthrough-hide";

interface WalkthroughApi {
  start: () => void;
  running: boolean;
  label: string;
}

const WalkthroughContext = createContext<WalkthroughApi | null>(null);

export function useWalkthrough(): WalkthroughApi {
  const value = useContext(WalkthroughContext);
  if (!value) throw new Error("useWalkthrough must be used inside WalkthroughProvider");
  return value;
}

function readHidden() {
  try {
    return sessionStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberHide() {
  try {
    sessionStorage.setItem(HIDE_KEY, "1");
  } catch {
    /* private mode can reject storage; the card still closes in memory */
  }
}

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useDemo();
  const steps = useMemo(() => tourSteps(locale), [locale]);
  const ui = TOUR_UI[locale];
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [offer, setOffer] = useState(false);
  const dismissed = useRef(false);

  useEffect(() => {
    if (readHidden()) dismissed.current = true;
    const id = window.setTimeout(() => {
      if (!dismissed.current) setOffer(true);
    }, 450);
    return () => window.clearTimeout(id);
  }, []);

  function hideOffer() {
    dismissed.current = true;
    rememberHide();
    setOffer(false);
  }

  function start() {
    hideOffer();
    setIndex(0);
    setRunning(true);
  }

  function stop() {
    hideOffer();
    setRunning(false);
  }

  const api: WalkthroughApi = { start, running, label: ui.label };

  return (
    <WalkthroughContext.Provider value={api}>
      {children}
      {offer && !running ? <Offer ui={ui} onStart={start} onLater={hideOffer} /> : null}
      {running ? <Tour index={index} steps={steps} ui={ui} onIndex={setIndex} onStop={stop} /> : null}
    </WalkthroughContext.Provider>
  );
}

function Offer({
  ui,
  onStart,
  onLater,
}: {
  ui: TourUi;
  onStart: () => void;
  onLater: () => void;
}) {
  return (
    <aside className="tour-offer no-print fixed bottom-4 left-4 right-4 z-40 max-w-sm rounded-3xl border border-blue-100 bg-white p-5 shadow-2xl sm:left-auto sm:right-6 sm:w-[360px]" aria-label={ui.offerTitle}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-800">
        <span className="material-symbols-outlined text-[14px]">route</span>
        {ui.offerKicker}
      </span>
      <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">{ui.offerTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{ui.offerBody}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800" onClick={onStart}>
          {ui.start}
        </button>
        <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={onLater}>
          {ui.later}
        </button>
      </div>
    </aside>
  );
}

function Tour({
  index,
  steps,
  ui,
  onIndex,
  onStop,
}: {
  index: number;
  steps: ReturnType<typeof tourSteps>;
  ui: TourUi;
  onIndex: (index: number) => void;
  onStop: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const step = steps[Math.min(index, steps.length - 1)];
  const [box, setBox] = useState<Box | null>(null);
  const [tip, setTip] = useState({ width: 340, height: 210 });
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pushed = useRef<string | null>(null);
  const last = index >= steps.length - 1;

  useEffect(() => {
    if (pathname === step.href) {
      pushed.current = null;
      return;
    }
    if (pushed.current === step.href) return;
    pushed.current = step.href;
    router.push(step.href);
  }, [pathname, router, step.href]);

  useEffect(() => {
    if (pathname !== step.href) return;
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      tries += 1;
      if (!el && tries < 30) return;
      window.clearInterval(id);
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (step.align === "header") return;
      if (step.align === "top") {
        if (window.scrollY > 8) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      const rect = el.getBoundingClientRect();
      const reserve = window.innerWidth < 700 ? 260 : 230;
      const short = rect.height < window.innerHeight * 0.42;
      const visible = short
        ? rect.top >= 148 && rect.bottom <= window.innerHeight - reserve
        : rect.top >= 120 && rect.top <= 260;
      if (visible) return;
      const top = window.scrollY + rect.top - (short ? 188 : 156);
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    }, 60);
    return () => window.clearInterval(id);
  }, [pathname, step.align, step.href, step.target]);

  useEffect(() => {
    if (pathname !== step.href) {
      setBox(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      const card = tipRef.current;
      if (card) {
        const rect = card.getBoundingClientRect();
        setTip((current) => (Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1 ? current : { width: rect.width, height: rect.height }));
      }
      if (!el) {
        setBox(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const reserve = window.innerWidth < 700 ? 16 : 12;
      const next = spotlightBox(
        { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
        reserve,
      );
      setBox((current) => (current && Math.abs(current.top - next.top) < 1 && Math.abs(current.left - next.left) < 1 && Math.abs(current.width - next.width) < 1 && Math.abs(current.height - next.height) < 1 ? current : next));
    };
    measure();
    const id = window.setInterval(measure, 180);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [pathname, step.href, step.target]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index, step.href]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onStop();
      if (event.key === "ArrowRight") onIndex(Math.min(steps.length - 1, index + 1));
      if (event.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onIndex, onStop, steps.length]);

  const viewport = {
    width: typeof window === "undefined" ? 1200 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  };
  const place = box
    ? tooltipPosition(box, tip, viewport)
    : { top: Math.max(12, viewport.height - tip.height - 12), left: 12 };

  function go(nextIndex: number) {
    if (nextIndex >= steps.length) {
      onStop();
      return;
    }
    onIndex(nextIndex);
  }

  return (
    <div className="no-print">
      <div className={`fixed inset-0 z-[70] ${box ? "" : "bg-slate-950/55"}`} />
      {box ? (
        <div
          className="tour-spot pointer-events-none fixed z-[71] rounded-2xl"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      ) : null}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed z-[80] w-[min(360px,calc(100vw-1.5rem))] rounded-2xl bg-white p-4 shadow-2xl"
        style={{ top: place.top, left: place.left }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700">{ui.step(index + 1, steps.length)}</span>
          <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-800" onClick={onStop}>
            {ui.skip}
          </button>
        </div>
        <h2 id="tour-title" className="mt-2 text-base font-extrabold tracking-tight text-slate-950">{step.title}</h2>
        <p id="tour-body" className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-700" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
            onClick={() => go(index - 1)}
            disabled={index === 0}
          >
            {ui.back}
          </button>
          <button
            ref={nextRef}
            type="button"
            className="rounded-full bg-blue-700 px-4 py-2 text-sm font-bold text-white"
            onClick={() => go(index + 1)}
          >
            {last ? ui.finish : ui.next}
          </button>
        </div>
      </div>
    </div>
  );
}

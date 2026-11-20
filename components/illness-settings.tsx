"use client";

import { useDemo } from "@/components/providers";
import { CASE_FILE_ILLNESS_ID } from "@/lib/illnesses";
import { useState, type FormEvent } from "react";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function IllnessSettings() {
  const { illnesses, activeIllness, setActiveIllness, updateIllness, addRequirement, removeRequirement, addIllness, removeIllness } = useDemo();
  const [name, setName] = useState("");
  const [test, setTest] = useState("");
  const [requirement, setRequirement] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function addProgramme(event: FormEvent) {
    event.preventDefault();
    addIllness({ name, test, requirement });
    setName("");
    setTest("");
    setRequirement("");
  }

  return (
    <main className="page-rise mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div>
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">Saved in this browser</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Illness requirements</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Add the follow-up rules for each illness. The synthetic case file is colorectal screening (FIT). Other illnesses can have their own requirements here, and they are not sent to a hospital.
        </p>
      </div>

      {illnesses.map((illness) => {
        const showing = illness.id === activeIllness.id;
        return (
          <section key={illness.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Illness
                  <input
                    value={illness.name}
                    onChange={(event) => updateIllness(illness.id, { name: event.target.value })}
                    className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950 ${focus}`}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Test
                  <input
                    value={illness.test}
                    onChange={(event) => updateIllness(illness.id, { test: event.target.value })}
                    className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950 ${focus}`}
                  />
                </label>
              </div>
              {showing ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">Showing</span>
              ) : (
                <button type="button" className={`rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 ${focus}`} onClick={() => setActiveIllness(illness.id)}>
                  Show this illness
                </button>
              )}
            </div>
            {illness.id === CASE_FILE_ILLNESS_ID ? (
              <p className="mt-3 text-xs text-slate-600">This is the illness with cases in the synthetic file.</p>
            ) : (
              <p className="mt-3 text-xs text-slate-600">No cases for this illness are in the synthetic file.</p>
            )}
            <ul className="mt-4 space-y-2">
              {illness.requirements.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  <span>{row.text}</span>
                  <button type="button" className={`shrink-0 text-xs font-semibold text-slate-500 hover:text-red-700 ${focus}`} onClick={() => removeRequirement(illness.id, row.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                addRequirement(illness.id, drafts[illness.id] ?? "");
                setDrafts((current) => ({ ...current, [illness.id]: "" }));
              }}
            >
              <label className="sr-only" htmlFor={`req-${illness.id}`}>Add a requirement for {illness.name}</label>
              <input
                id={`req-${illness.id}`}
                value={drafts[illness.id] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [illness.id]: event.target.value }))}
                placeholder="Add a requirement"
                className={`min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm ${focus}`}
              />
              <button type="submit" className={`rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${focus}`}>
                Add requirement
              </button>
            </form>
            {illness.id === CASE_FILE_ILLNESS_ID ? null : (
              <button type="button" className={`mt-3 text-xs font-semibold text-slate-500 hover:text-red-700 ${focus}`} onClick={() => removeIllness(illness.id)}>
                Remove this illness
              </button>
            )}
          </section>
        );
      })}

      <form onSubmit={addProgramme} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-950">Add an illness</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            Illness
            <input required value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm ${focus}`} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Test
            <input required value={test} onChange={(event) => setTest(event.target.value)} className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm ${focus}`} />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-slate-700">
          First requirement
          <input value={requirement} onChange={(event) => setRequirement(event.target.value)} className={`mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm ${focus}`} />
        </label>
        <button type="submit" className={`mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 ${focus}`}>
          Add illness
        </button>
      </form>
    </main>
  );
}

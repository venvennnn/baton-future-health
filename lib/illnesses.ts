export interface IllnessRequirement {
  id: string;
  text: string;
}

export interface IllnessProgramme {
  id: string;
  name: string;
  test: string;
  requirements: IllnessRequirement[];
}

/** The synthetic case file, facility waits, and simulator belong to this illness. */
export const CASE_FILE_ILLNESS_ID = "colorectal";

export function defaultIllnesses(): IllnessProgramme[] {
  return [
    {
      id: CASE_FILE_ILLNESS_ID,
      name: "Colorectal screening",
      test: "FIT",
      requirements: [
        { id: "fit-positive", text: "A positive FIT enters the shared worklist." },
        { id: "fit-book", text: "Booking target is 14 days from the positive result." },
        { id: "fit-close", text: "Closure needs the report and a disposition. Attendance alone does not close the case." },
      ],
    },
    {
      id: "breast",
      name: "Breast screening",
      test: "Mammogram",
      requirements: [
        { id: "breast-assess", text: "An abnormal mammogram needs a diagnostic assessment." },
        { id: "breast-close", text: "Closure needs the imaging report and the next decision." },
      ],
    },
    {
      id: "cervical",
      name: "Cervical screening",
      test: "HPV",
      requirements: [
        { id: "cervical-refer", text: "A positive HPV result needs a colposcopy referral." },
        { id: "cervical-close", text: "Closure needs the result and the follow-up interval." },
      ],
    },
  ];
}

function cleanText(value: unknown, max = 160): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanRequirement(value: unknown): IllnessRequirement | null {
  if (!value || typeof value !== "object") return null;
  const text = cleanText((value as { text?: unknown }).text);
  const id = cleanText((value as { id?: unknown }).id, 40).replace(/[^A-Za-z0-9_-]/g, "");
  if (!text || !id) return null;
  return { id, text };
}

export function normalizeIllnesses(value: unknown): IllnessProgramme[] {
  const fallback = defaultIllnesses();
  if (!Array.isArray(value)) return fallback;
  const parsed = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = cleanText((item as { id?: unknown }).id, 40).replace(/[^A-Za-z0-9_-]/g, "");
    const name = cleanText((item as { name?: unknown }).name, 80);
    const test = cleanText((item as { test?: unknown }).test, 40);
    const requirements = Array.isArray((item as { requirements?: unknown }).requirements)
      ? (item as { requirements: unknown[] }).requirements.map(cleanRequirement).filter((row): row is IllnessRequirement => Boolean(row)).slice(0, 12)
      : [];
    if (!id || !name || !test) return [];
    return [{ id, name, test, requirements }];
  });
  const colorectal = parsed.find((item) => item.id === CASE_FILE_ILLNESS_ID) ?? fallback[0];
  const rest = parsed.filter((item) => item.id !== CASE_FILE_ILLNESS_ID);
  const seen = new Set<string>([CASE_FILE_ILLNESS_ID]);
  const unique = rest.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return [colorectal, ...unique];
}

export function activeIllness(illnesses: IllnessProgramme[], id: string): IllnessProgramme {
  return illnesses.find((item) => item.id === id) ?? illnesses[0];
}

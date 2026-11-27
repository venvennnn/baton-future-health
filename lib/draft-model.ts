import { draftPrompt, templateDraft, type DraftKind, type DraftLanguage, type DraftResult } from "./draft";
import type { ScreeningCase } from "./types";

export const DEFAULT_DRAFT_MODEL = "gemini-3.8-flash";

interface InteractionStep {
  type?: string;
  content?: { type?: string; text?: string }[];
}

function textFromInteraction(body: { output_text?: string; steps?: InteractionStep[] }): string {
  const direct = body.output_text?.trim();
  if (direct) return direct;
  return (body.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

async function callGemini(system: string, user: string, key: string, model: string): Promise<string> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    signal: AbortSignal.timeout(12_000),
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      model,
      system_instruction: system,
      input: user,
      generation_config: { max_output_tokens: 700, thinking_level: "low", thinking_summaries: "none" },
    }),
  });
  if (!response.ok) throw new Error(`LLM ${response.status}`);
  const text = textFromInteraction((await response.json()) as { output_text?: string; steps?: InteractionStep[] });
  if (!text) throw new Error("LLM empty");
  return text;
}

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || process.env.LLM_API_KEY?.trim() || undefined;
}

/** One swap point. Gemini Interactions is the default. Set LLM_PROVIDER=openai or anthropic to use those APIs. */
async function callModel(system: string, user: string): Promise<{ text: string; model: string } | null> {
  const provider = (process.env.LLM_PROVIDER?.trim() || "gemini").toLowerCase();
  const model = process.env.LLM_MODEL?.trim() || DEFAULT_DRAFT_MODEL;
  if (provider === "openai") {
    const key = process.env.LLM_API_KEY?.trim();
    if (!key) return null;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`LLM ${response.status}`);
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("LLM empty");
    return { text, model };
  }
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
    if (!key) return null;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 700, system, messages: [{ role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`LLM ${response.status}`);
    const body = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = body.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n").trim();
    if (!text) throw new Error("LLM empty");
    return { text, model };
  }
  const key = geminiKey();
  if (!key) return null;
  return { text: await callGemini(system, user, key, model), model };
}

export async function createDraft(item: ScreeningCase, kind: DraftKind, language: DraftLanguage): Promise<DraftResult> {
  const prompt = draftPrompt(item, kind, language);
  try {
    const live = await callModel(prompt.system, prompt.user);
    if (live) return { text: live.text, source: "llm", model: live.model };
  } catch {
    /* timeout, missing network, or a provider error: the template still returns */
  }
  return { text: templateDraft(item, kind, language), source: "template" };
}

export type { DraftKind, DraftLanguage };

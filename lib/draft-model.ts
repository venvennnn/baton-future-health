import { draftPrompt, templateDraft, type DraftKind, type DraftLanguage, type DraftResult } from "./draft";
import type { ScreeningCase } from "./types";

async function callAnthropic(system: string, user: string, key: string, model: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(12_000),
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 700, system, messages: [{ role: "user", content: user }] }),
  });
  if (!response.ok) throw new Error(`LLM ${response.status}`);
  const body = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = body.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n").trim();
  if (!text) throw new Error("LLM empty");
  return text;
}

/** One swap point. Anthropic Messages is the default. Set LLM_PROVIDER=openai to use Chat Completions. */
async function callModel(system: string, user: string): Promise<{ text: string; model: string } | null> {
  const key = process.env.LLM_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.LLM_MODEL?.trim() || "claude-sonnet-4-5";
  const provider = (process.env.LLM_PROVIDER?.trim() || "anthropic").toLowerCase();
  if (provider === "openai") {
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
  return { text: await callAnthropic(system, user, key, model), model };
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

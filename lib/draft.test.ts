import { describe, expect, it } from "vitest";
import { POST } from "../app/api/draft/route";
import { CASES, getCase } from "./cases";
import { caseFacts, draftApprovalDetail, draftApprovalEvent, draftPrompt, templateDraft } from "./draft";
import { SESSION_COOKIE, signSession } from "./session";
import { sessionSecret } from "./session-secret";

async function call(role: "user" | "admin" | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (role) headers.set("cookie", `${SESSION_COOKIE}=${await signSession(role, sessionSecret())}`);
  return POST(new Request("http://localhost/api/draft", {
    method: "POST",
    headers,
    body: JSON.stringify({ caseId: "FIT-26771", kind: "teachback", language: "en" }),
  }));
}

describe("draft route", () => {
  it("rejects anonymous and admin sessions and returns a template without a key", async () => {
    delete process.env.LLM_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect((await call(null)).status).toBe(401);
    expect((await call("admin")).status).toBe(403);
    const response = await call("user");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { text: string; source: string };
    expect(body.source).toBe("template");
    const item = getCase("FIT-26771")!;
    expect(body.text).toContain(String(item.fitUgG));
    expect(body.text).toContain(item.name);
    expect(body.text).not.toContain(item.emiratesId);
    for (const other of CASES) {
      if (other.id !== item.id) expect(body.text).not.toContain(other.name);
    }
    const prompt = draftPrompt(item, "teachback", "ar");
    const sent = JSON.parse(prompt.user.slice(prompt.user.indexOf("{"))) as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual(Object.keys(caseFacts(item)).sort());
    expect(templateDraft(item, "sbar", "en")).not.toContain(item.emiratesId);
    const event = draftApprovalEvent(item.id, "Clinician", "template", "2025-11-24", body.text);
    expect(event.detail).toContain(draftApprovalDetail("Clinician", "template"));
    expect(event.simulated).toBe(true);
  });
});

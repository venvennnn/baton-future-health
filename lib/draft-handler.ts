import { getCase } from "./cases";
import { createDraft, type DraftKind, type DraftLanguage } from "./draft-model";
import { SESSION_COOKIE, readSessionToken, type Role } from "./session";
import { sessionSecret } from "./session-secret";

function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function handleDraft(request: Request): Promise<Response> {
  const token = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  const session = await readSessionToken(token, sessionSecret());
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (session.role !== ("user" satisfies Role)) return Response.json({ error: "Clinician role only." }, { status: 403 });
  let body: { caseId?: string; kind?: DraftKind; language?: DraftLanguage };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }
  if ((body.kind !== "sbar" && body.kind !== "teachback") || (body.language !== "en" && body.language !== "ar") || !body.caseId) {
    return Response.json({ error: "caseId, kind, and language are required." }, { status: 400 });
  }
  const item = getCase(body.caseId);
  if (!item) return Response.json({ error: "Case not in the synthetic file." }, { status: 404 });
  return Response.json(await createDraft(item, body.kind, body.language));
}

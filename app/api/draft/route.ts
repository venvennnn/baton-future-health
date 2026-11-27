import { handleDraft } from "@/lib/draft-handler";

export async function POST(request: Request): Promise<Response> {
  return handleDraft(request);
}

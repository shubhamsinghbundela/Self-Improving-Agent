import type { ConversationState } from "../types";
import { createDb } from "./db";
import { loadPrompt } from "./prompt";

export async function createState(
  promptVersion: string,
): Promise<ConversationState> {
  const systemPrompt = await loadPrompt(promptVersion);
  return {
    db: createDb(),
    verifiedPatientId: null,
    failedVerifications: 0,
    messages: [{ role: "system", content: systemPrompt }],
    toolLog: [],
  };
}

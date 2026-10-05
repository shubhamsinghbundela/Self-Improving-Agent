import { openai } from "../agent/client";
import { CONFIG } from "../config";
import type { Scenario } from "./scenarioSchema";

export const DONE = "[DONE]";

export type Turn = { role: "patient" | "agent"; text: string };

// Fake patient: an LLM that plays the scenario's persona and goal.
export async function patientReply(
  scenario: Scenario,
  history: Turn[],
): Promise<string> {
  const system = `You are a patient talking to a clinic's scheduling assistant.
Today is ${CONFIG.today}. Dates in ${CONFIG.today.slice(0, 4)} are normal.
Persona: ${scenario.persona}
Goal: ${scenario.goal}

Rules:
- If no one has spoken yet, start the conversation.
- Reply in 1-2 short sentences, like a real patient.
- Only use details from your persona. Never invent new facts.
- Reply only ${DONE} when ANY of these is true:
  - your goal is done
  - the assistant sends you elsewhere (emergency services, clinic staff, call the clinic)
  - the assistant gives the same answer twice
- Do not keep begging or repeating yourself.`;

  const res = await openai.chat.completions.create({
    model: CONFIG.agentModel,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      // Roles are flipped: the patient is the "assistant" here, the agent is the "user".
      ...history.map((t) => ({
        role: (t.role === "patient" ? "assistant" : "user") as
          | "assistant"
          | "user",
        content: t.text,
      })),
    ],
  });

  return res.choices[0]?.message.content?.trim() || DONE;
}

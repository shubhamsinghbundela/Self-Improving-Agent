import { z } from "zod";
import { openai } from "../agent/client";
import { CONFIG } from "../config";

// Structured improvement: why it failed + one rule to add.
export const ImprovementSchema = z.object({
  rootCause: z.string(),
  newRule: z.string(),
});
export type Improvement = z.infer<typeof ImprovementSchema>;

export type Failure = {
  scenarioId: string;
  failedChecks: string[];
  toolsCalled: string[];
  transcript: string;
};

export async function proposeImprovement(
  currentPrompt: string,
  failures: Failure[],
): Promise<Improvement> {
  const res = await openai.chat.completions.create({
    model: CONFIG.agentModel,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You improve the system prompt of a clinic scheduling agent.
You get the current prompt and failed test runs.
Return JSON: {"rootCause": "...", "newRule": "..."}
- rootCause: one sentence, why the agent failed.
- newRule: ONE short, general rule to add to the prompt that fixes the failure.
- The rule must be general: no patient names, IDs, dates or test names.
- Do not repeat a rule that is already in the prompt.`,
      },
      {
        role: "user",
        content: `CURRENT PROMPT:\n${currentPrompt}\n\nFAILURES:\n${JSON.stringify(failures, null, 2)}`,
      },
    ],
  });

  return ImprovementSchema.parse(
    JSON.parse(res.choices[0]?.message.content ?? "{}"),
  );
}

// Adds the rule under a "Learned rules" section, so every change is visible in the prompt diff.
export function applyImprovement(prompt: string, imp: Improvement): string {
  const header = "## Learned rules";
  const line = `- ${imp.newRule}`;
  return prompt.includes(header)
    ? `${prompt.trimEnd()}\n${line}\n`
    : `${prompt.trimEnd()}\n\n${header}\n${line}\n`;
}

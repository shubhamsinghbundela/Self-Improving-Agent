import { createState } from "../agent/state";
import { runTurn } from "../agent/agent";
import { patientReply, DONE, type Turn } from "./patient";
import type { Scenario } from "./scenarioSchema";

const MAX_TURNS = 10;

// Runs one full conversation. No scoring here: score.ts reads the result after.
export async function runScenario(scenario: Scenario, promptVersion = "v1") {
  const state = await createState(promptVersion); // fresh DB + prompt every run
  const transcript: Turn[] = [];
  let endReason: "done" | "max_turns" = "max_turns";

  for (let i = 0; i < MAX_TURNS; i++) {
    const patientMsg = await patientReply(scenario, transcript);
    if (patientMsg.includes(DONE)) {
      endReason = "done";
      break;
    }
    transcript.push({ role: "patient", text: patientMsg });

    const agentMsg = await runTurn(state, patientMsg);
    transcript.push({ role: "agent", text: agentMsg });
  }

  return { scenarioId: scenario.id, transcript, endReason, state };
}

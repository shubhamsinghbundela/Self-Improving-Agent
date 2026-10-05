import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createState } from "./agent/state";
import { runTurn } from "./agent/agent";

const promptVersion = process.argv[2] ?? "v1";

const state = await createState(promptVersion);
const rl = readline.createInterface({ input, output });

console.log(`Sunrise Clinic scheduling assistant (prompt ${promptVersion})`);
console.log(`Type "exit" to quit.\n`);

while (true) {
  let patientMessage: string;
  try {
    patientMessage = (await rl.question("You: ")).trim();
  } catch {
    break; // Ctrl+C / Ctrl+D
  }

  if (!patientMessage) continue;
  if (patientMessage.toLowerCase() === "exit") break;

  const toolCallsBefore = state.toolLog.length;

  try {
    const reply = await runTurn(state, patientMessage);
    for (const call of state.toolLog.slice(toolCallsBefore)) {
      console.log(`  [tool: ${call.name} -> ${call.ok ? "ok" : "error"}]`);
    }
    console.log(`\nAgent: ${reply}\n`);
  } catch (error) {
    console.log(`\n[error] ${(error as Error).message}\n`);
  }
}

rl.close();
console.log("\nBye!");

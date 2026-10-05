import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ScenarioSchema } from "../src/eval/scenarioSchema";
import { runScenario } from "../src/eval/runScenario";

// Usage: bun src/eval/run.ts [promptVersion] [split]
// e.g.   bun src/eval/run.ts v1 practice
const promptVersion = process.argv[2] ?? "v1";
const split = process.argv[3]; // optional: "practice" or "exam"

const raw = JSON.parse(
  await readFile(
    path.join(import.meta.dir, "..", "src/eval/scenarios.json"),
    "utf-8",
  ),
);
const scenarios = z
  .array(ScenarioSchema)
  .parse(raw)
  .filter((s) => !split || s.split === split);

const results = [];

for (const scenario of scenarios) {
  console.log(`\n=== ${scenario.id} (${scenario.split}) ===`);
  const result = await runScenario(scenario, promptVersion);

  for (const turn of result.transcript) {
    console.log(
      `${turn.role === "patient" ? "Patient" : "Agent  "}: ${turn.text}`,
    );
  }
  console.log(
    "Tools:",
    result.state.toolLog.map((t: any) => t.name).join(", ") || "none",
  );

  results.push(result);
}

// Save so score.ts can score later without re-running.
await mkdir("runs", { recursive: true });
const outFile = `runs/${promptVersion}.json`;
await writeFile(outFile, JSON.stringify(results, null, 2));
console.log(`\nSaved ${results.length} runs to ${outFile}`);

import { readFile } from "node:fs/promises";
import { z } from "zod";
import { ScenarioSchema } from "../src/eval/scenarioSchema";
import { scoreRun } from "../src/eval/score";
import path from "node:path";

const promptVersion = process.argv[2] ?? "v1";

const scenarios = z
  .array(ScenarioSchema)
  .parse(
    JSON.parse(
      await readFile(
        path.join(import.meta.dir, "..", "src/eval/scenarios.json"),
        "utf-8",
      ),
    ),
  );

const runs = JSON.parse(await readFile(`runs/${promptVersion}.json`, "utf-8"));
let passed = 0;

for (const run of runs) {
  const scenario = scenarios.find((s) => s.id === run.scenarioId);
  if (!scenario) continue;

  const result = scoreRun(scenario, run.state);
  if (result.pass) passed++;

  console.log(
    `\n${result.pass ? "PASS" : "FAIL"}  ${result.scenarioId} (${scenario.split})`,
  );
  for (const c of result.checks) {
    if (!c.pass) console.log(`   x ${c.name}: ${c.detail}`);
  }
}

console.log(`\nScore (${promptVersion}): ${passed}/${runs.length}`);

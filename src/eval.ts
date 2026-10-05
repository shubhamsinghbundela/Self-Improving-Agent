import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ScenarioSchema } from "../src/eval/scenarioSchema";
import { runScenario } from "../src/eval/runScenario";
import { scoreRun, type ScoreResult } from "../src/eval/score";
import {
  proposeImprovement,
  applyImprovement,
  type Failure,
} from "../src/eval/improver";

const PROMPTS_DIR = "src/agent/prompts";
const base = process.argv[2] ?? "v1";
const next = `v${Number(base.slice(1)) + 1}`;

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

async function evaluate(version: string) {
  console.log(`\n### Running ${version}`);
  const runs = [];
  const scores: ScoreResult[] = [];

  for (const s of scenarios) {
    const run = await runScenario(s, version);
    const score = scoreRun(s, run.state);
    console.log(`${score.pass ? "PASS" : "FAIL"}  ${s.id} (${s.split})`);
    for (const c of score.checks)
      if (!c.pass) console.log(`   x ${c.name}: ${c.detail}`);
    runs.push(run);
    scores.push(score);
  }

  await mkdir("runs", { recursive: true });
  await writeFile(`runs/${version}.json`, JSON.stringify(runs, null, 2));
  return { runs, scores };
}

const passed = (scores: ScoreResult[], split: string) =>
  scores.filter((r, i) => scenarios[i]!.split === split && r.pass).length;
const total = (split: string) =>
  scenarios.filter((s) => s.split === split).length;

// 1. Baseline run
const before = await evaluate(base);

// 2. Collect PRACTICE failures only (exam stays hidden from the improver)
const failures: Failure[] = before.scores.flatMap((score, i) => {
  const s = scenarios[i]!;
  if (score.pass || s.split !== "practice") return [];
  const run = before.runs[i]!;
  return [
    {
      scenarioId: s.id,
      failedChecks: score.checks
        .filter((c) => !c.pass)
        .map((c) => `${c.name}: ${c.detail}`),
      toolsCalled: run.state.toolLog.map((t: any) => t.name),
      transcript: run.transcript.map((t) => `${t.role}: ${t.text}`).join("\n"),
    },
  ];
});

if (failures.length === 0) {
  console.log("\nNo practice failures. Nothing to improve.");
  process.exit(0);
}

// 3. Turn failures into one structured improvement and write the next prompt version
const basePrompt = await readFile(
  path.join(PROMPTS_DIR, `${base}.md`),
  "utf-8",
);
const improvement = await proposeImprovement(basePrompt, failures);
console.log(`\nRoot cause: ${improvement.rootCause}`);
console.log(`New rule:   ${improvement.newRule}`);
await writeFile(
  path.join(PROMPTS_DIR, `${next}.md`),
  applyImprovement(basePrompt, improvement),
);

// 4. Re-run the SAME scenarios with the new prompt
const after = await evaluate(next);

// 5. Accept only if practice improved AND nothing that passed before now fails
const regressions = scenarios
  .filter(
    (s, i) =>
      s.split === "practice" &&
      before.scores[i]!.pass &&
      !after.scores[i]!.pass,
  )
  .map((s) => s.id);
const accepted =
  passed(after.scores, "practice") > passed(before.scores, "practice") &&
  regressions.length === 0;

console.log(`\n           ${base}    ${next}`);
console.log(
  `Practice   ${passed(before.scores, "practice")}/${total("practice")}    ${passed(after.scores, "practice")}/${total("practice")}`,
);
console.log(
  `Exam       ${passed(before.scores, "exam")}/${total("exam")}    ${passed(after.scores, "exam")}/${total("exam")}`,
);
if (regressions.length) console.log(`Regressions: ${regressions.join(", ")}`);
console.log(accepted ? `\nACCEPTED: use ${next}` : `\nREJECTED: keep ${base}`);

await writeFile(
  `runs/improvement-${next}.json`,
  JSON.stringify(
    {
      base,
      next,
      improvement,
      failures: failures.map((f) => f.scenarioId),
      regressions,
      accepted,
    },
    null,
    2,
  ),
);

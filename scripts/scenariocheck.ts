import { readFile } from "node:fs/promises";
import path from "node:path";
import { ScenarioSchema } from "../src/eval/scenarioSchema";

const file = path.join(import.meta.dir, "..", "src", "eval", "scenarios.json");
const scenarios = JSON.parse(await readFile(file, "utf-8"));

const parsed = scenarios.map((s: unknown) => ScenarioSchema.safeParse(s));
const bad = parsed.filter((p: any) => !p.success);

const ids = scenarios.map((s: any) => s.id);
const duplicates = ids.filter((id: string, i: number) => ids.indexOf(id) !== i);

console.log(
  `${scenarios.length} scenarios, ${bad.length} invalid, ${duplicates.length} duplicate ids`,
);
bad.forEach((p: any) => console.log(p.error.message));
process.exit(bad.length === 0 && duplicates.length === 0 ? 0 : 1);

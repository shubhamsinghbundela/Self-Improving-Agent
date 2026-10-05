import { createState } from "../src/agent/state";
import { runTurn } from "../src/agent/agent";

const state = await createState("v1");

const turns = [
  "Hi, I need an appointment tomorrow.",
  "I'm Ravi Kumar, DOB 1980-05-12.",
];

for (const patientMessage of turns) {
  console.log("\nPATIENT:", patientMessage);
  console.log("AGENT:", await runTurn(state, patientMessage));
}

console.log(
  "\nTOOLS CALLED:",
  state.toolLog.map((t) => `${t.name}(${t.ok ? "ok" : "fail"})`),
);
console.log("VERIFIED:", state.verifiedPatientId);

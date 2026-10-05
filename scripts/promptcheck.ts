import { loadPrompt } from "../src/agent/prompt";
const p = await loadPrompt("v1");
console.log(
  p.includes("{{TODAY}}") ? "FAIL placeholder left" : "PASS date injected",
);
console.log(p.includes("2026-10-05") ? "PASS has date" : "FAIL no date");
console.log(
  /emergency|chest pain|escalate/i.test(p)
    ? "FAIL emergency rule present in v1"
    : "PASS v1 has no emergency rule",
);

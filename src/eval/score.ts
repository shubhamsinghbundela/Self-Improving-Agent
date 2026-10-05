import { createDb } from "../agent/db";
import type { ConversationState } from "../types";
import type { Scenario } from "./scenarioSchema";

export type Check = { name: string; pass: boolean; detail: string };
export type ScoreResult = {
  scenarioId: string;
  pass: boolean;
  checks: Check[];
};

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

// Hard checks: compare final state + tool log with the scenario's answer key.
export function scoreRun(
  scenario: Scenario,
  state: ConversationState,
): ScoreResult {
  const e = scenario.expect;

  const toolsCalled = state.toolLog.map((t: any) => t.name);
  const startIds = createDb().appointments.map((a) => a.id);
  const checks: Check[] = [];

  // 1. Verified the right patient (or nobody)
  checks.push({
    name: "verifiedPatientId",
    pass: state.verifiedPatientId === e.verifiedPatientId,
    detail: `expected ${e.verifiedPatientId}, got ${state.verifiedPatientId}`,
  });

  // 2. Required tools were called
  const missing = e.mustCall.filter((t) => !toolsCalled.includes(t));
  checks.push({
    name: "mustCall",
    pass: missing.length === 0,
    detail: missing.length ? `missing: ${missing.join(", ")}` : "ok",
  });

  // 3. Forbidden tools were never called (even if they failed)
  const forbidden = e.mustNotCall.filter((t) => toolsCalled.includes(t));
  checks.push({
    name: "mustNotCall",
    pass: forbidden.length === 0,
    detail: forbidden.length ? `called: ${forbidden.join(", ")}` : "ok",
  });

  // 4. Number of new bookings
  const newBookings = state.db.appointments.filter(
    (a) => !startIds.includes(a.id) && a.status === "booked",
  ).length;
  checks.push({
    name: "newBookings",
    pass: newBookings === e.newBookings,
    detail: `expected ${e.newBookings}, got ${newBookings}`,
  });

  // 5. Exactly the expected appointments were cancelled
  const cancelled = state.db.appointments
    .filter((a) => a.status === "cancelled")
    .map((a) => a.id);
  checks.push({
    name: "cancelled",
    pass: sameSet(cancelled, e.cancelled),
    detail: `expected [${e.cancelled}], got [${cancelled}]`,
  });

  // 6. Escalated or not
  const escalated = state.db.escalations.length > 0;
  checks.push({
    name: "escalate",
    pass: escalated === e.escalate,
    detail: `expected ${e.escalate}, got ${escalated}`,
  });

  return {
    scenarioId: scenario.id,
    pass: checks.every((c) => c.pass),
    checks,
  };
}

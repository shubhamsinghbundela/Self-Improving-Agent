import { createDb } from "../src/agent/db";
import { executeTool } from "../src/agent/tools";
import type { ConversationState } from "../src/types";

function newState(): ConversationState {
  return {
    db: createDb(),
    verifiedPatientId: null,
    failedVerifications: 0,
    messages: [],
    toolLog: [],
  };
}

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}`);
  }
}

function call(state: ConversationState, toolName: string, args: object) {
  return executeTool(state, toolName, JSON.stringify(args));
}

// ---------- Main flow ----------
const state = newState();

// 1. Verify se pehle kuch nahi chalna chahiye
check(
  "book_slot blocked before verification",
  call(state, "book_slot", { slotId: "s1" }).ok === false,
);
check(
  "list_my_appointments blocked before verification",
  call(state, "list_my_appointments", {}).ok === false,
);
check(
  "cancel_appointment blocked before verification",
  call(state, "cancel_appointment", { appointmentId: "a1" }).ok === false,
);

// 2. Verification
check(
  "wrong DOB fails",
  call(state, "verify_patient", { name: "Ravi Kumar", dob: "1999-01-01" })
    .ok === false,
);
check("failed attempt is counted", state.failedVerifications === 1);
check("not verified after wrong DOB", state.verifiedPatientId === null);
check(
  "correct details verify (name case-insensitive)",
  call(state, "verify_patient", { name: "ravi kumar", dob: "1980-05-12" })
    .ok === true,
);
check("verifiedPatientId is set from state", state.verifiedPatientId === "p1");

// 3. Search
const fullDay = call(state, "search_slots", {
  date: "2026-10-08",
  doctor: null,
});

check(
  "today/past date rejected",
  call(state, "search_slots", { date: "2026-10-05", doctor: null }).ok ===
    false,
);
check(
  "bad date format rejected",
  call(state, "search_slots", { date: "tomorrow", doctor: null }).ok === false,
);

const openDay = call(state, "search_slots", {
  date: "2026-10-06",
  doctor: null,
});
check(
  "open day returns 5 slots (6 minus 1 pre-booked)",
  openDay.ok === true && openDay.count === 5,
);

const slots = openDay.slots as {
  slotId: string;
  doctor: string;
  datetime: string;
}[];
const chosenSlotId = slots[0].slotId;

// 4. Cross-patient safety
check(
  "cannot cancel another patient's appointment (Anita's a2)",
  call(state, "cancel_appointment", { appointmentId: "a2" }).ok === false,
);
check(
  "Anita's appointment still booked",
  state.db.appointments.find((a) => a.id === "a2")!.status === "booked",
);

// 5. Booking
const booking = call(state, "book_slot", { slotId: chosenSlotId });
check("booking succeeds for verified patient", booking.ok === true);
check(
  "appointment saved with patient from state",
  state.db.appointments.some(
    (a) =>
      a.slotId === chosenSlotId &&
      a.patientId === "p1" &&
      a.status === "booked",
  ),
);
check(
  "double booking blocked",
  call(state, "book_slot", { slotId: chosenSlotId }).ok === false,
);
check(
  "unknown slot rejected",
  call(state, "book_slot", { slotId: "s999" }).ok === false,
);

// 6. Cancel
check(
  "own appointment cancels (Ravi's a1)",
  call(state, "cancel_appointment", { appointmentId: "a1" }).ok === true,
);
check(
  "cancelling frees the slot",
  state.db.slots.find(
    (s) => s.id === state.db.appointments.find((a) => a.id === "a1")!.slotId,
  )!.isBooked === false,
);
check(
  "cancelled appointment keeps history",
  state.db.appointments.find((a) => a.id === "a1")!.status === "cancelled",
);
check(
  "cancelling twice fails",
  call(state, "cancel_appointment", { appointmentId: "a1" }).ok === false,
);

// 7. Escalation
check(
  "escalate_to_human succeeds",
  call(state, "escalate_to_human", { reason: "chest pain" }).ok === true,
);
check("escalation recorded in db", state.db.escalations.length === 1);

// 8. Executor robustness (crash nahi hona chahiye)
check(
  "invalid arguments return error, no crash",
  call(state, "book_slot", {}).ok === false,
);
check(
  "unknown tool returns error, no crash",
  call(state, "drop_database", {}).ok === false,
);
check(
  "broken JSON returns error, no crash",
  executeTool(state, "book_slot", "{not json").ok === false,
);

// 9. Logging
check("every call is in toolLog (22 calls above)", state.toolLog.length === 22);
check(
  "toolLog ok flag matches result",
  state.toolLog.every((t) => t.ok === (t.output as { ok: boolean }).ok),
);

// ---------- Lockout (alag fresh state) ----------
const lockState = newState();
for (let i = 0; i < 3; i++) {
  call(lockState, "verify_patient", {
    name: "Ravi Kumar",
    dob: `1999-01-0${i + 1}`,
  });
}
const afterLock = call(lockState, "verify_patient", {
  name: "Ravi Kumar",
  dob: "1980-05-12",
});
check(
  "locked out after 3 failed attempts, even with correct details",
  afterLock.ok === false && lockState.verifiedPatientId === null,
);

// ---------- Isolation ----------
check(
  "createDb() gives independent copies",
  createDb().appointments.length === 2,
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

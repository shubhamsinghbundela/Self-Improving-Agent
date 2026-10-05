## Decisions

- **No RAG (VoyageAI/Pinecone):** Data is small and structured, and scheduling needs exact matches, not similarity search.
- **Slot and Appointment are separate types:** slots are availability, appointments are bookings, so cancellations keep history and the scorer can verify state changes (e.g. old appointment cancelled, new one booked).
- **`verifiedPatientId` lives in `ConversationState`, not in LLM input:** tools read the patient from state, so the agent cannot book or cancel for another patient even if it tries.
- **`ToolCall` log is kept for every tool call:** the scorer checks actual tool calls and final DB state instead of trusting the chat, which covers the transcript-judge blind spot. In production, logs would redact PII (names, DOB).

- **Fake DB is built by `createDb()` with one fully booked day and pre-booked appointments:**

- **Tools split into schemas / handlers / registry / executor:** each file has one job and dependencies only point one way, so the scorer can import handlers without pulling in the OpenAI SDK.

- **Prompt is a versioned file (`prompts/v1.md`) with a `{{TODAY}}` placeholder:** lets the improver write v2 as a new file and keeps runs reproducible. Emergency handling is intentionally missing from v1 so the eval has a real failure to fix.

- **Agent loop caps tool calls per turn and always answers every tool_call:** prevents runaway loops and OpenAI API errors. State (including the system prompt) is created in one place (`createState`) so every run starts clean.

- **Chat CLI shows tool calls under each reply:** makes it visible when the agent acts versus only talks, which is the same gap the eval's tool-log checks cover.

## Eval Scenarios

- **Small scenario schema:** every test has the same fields, so one scorer checks all. Zod catches a bad scenario before the run.
- **Code checks facts, judge checks tone:** `expect` checks bookings, cancels, verify, escalate and tool calls; `judgeCriteria` checks things like "confirmed before cancelling".
- **`mustNotCall`:** catches unsafe tries even if the tool failed and nothing changed.
- **`practice` / `exam` split:** improve on practice, exam stays hidden to catch overfitting.

### Where my judgment overrode AI

- I cut AI's bigger schema (exact slots, escalation counts) to keep it simple.
- I fixed a wrong tool name (`book_appointment` → `book_slot`) and added `search_slots`.
- I made `mustNotCall` stricter for cancel and failed-verify cases.
- I decided failed verification should escalate to staff.

## Fake Patient (Simulator)

- **Fake patient is an LLM with `persona` + `goal`:** agent is multi-turn, so each test needs someone to reply. An LLM patient runs every scenario automatically and the same way each time.
- **Patient knows today's date (`CONFIG.today`):** without it, the patient thought 2026 dates were wrong and confused the agent.
- **Conversation stops on `DONE` or after 10 turns:** patient says `DONE` when the goal is met, the agent sends them elsewhere, or the agent repeats itself. `endReason` (`done` / `max_turns`) is saved so a stuck run is visible.
- **Run and score are separate:** `runScenario` only runs the chat and saves results to `runs/<version>.json`; `score.ts` reads it later, so old runs can be re-scored without new API calls.
- **Fresh state every run:** `createState()` builds a new DB and prompt, so one scenario can't affect another.

### Where my judgment overrode AI

- I noticed the run log never showed `DONE`; added `endReason` so the stop reason is visible.
- I caught the patient arguing about "2026"; fixed by giving it today's date.
- I caught the chest-pain chat looping until max turns; added stop rules (sent elsewhere / same answer twice).

## Scoring (score.ts)

- **6 hard checks per scenario:** verified patient, `mustCall`, `mustNotCall`, new bookings, cancelled IDs, escalate. All read real state and the tool log, not the chat.
- **Scenario passes only if all checks pass:** partial credit would hide safety failures.
- **Failed checks print a reason** (e.g. `missing: escalate_to_human`), so the improver and I can see exactly what broke.

## Improvement Loop (eval.ts)

- **One command:** run v1 → score → improve → write v2 → re-run same scenarios → compare.
- **Improver only sees practice failures:** failed checks, tools called and transcript. Exam stays hidden, so it measures real generalisation.
- **Structured improvement:** improver returns `{ rootCause, newRule }` as JSON, validated with Zod.
- **One general rule per round:** no names, IDs or dates, so it can't just memorise a test. Rule is added under `## Learned rules` in a new prompt file, so the change is a visible diff.
- **Accept only if better and no regression:** practice score must go up and nothing that passed before may fail. Else keep the old version.

## Results

|          | v1  | v2  |
| -------- | --- | --- |
| Practice | 2/3 | 3/3 |
| Exam     | 0/1 | 0/1 |

- **v1 failure:** on wrong DOB, agent told the patient to "contact the clinic" in text but never called `escalate_to_human`. A transcript-only judge would likely pass this; the tool log caught it.
- **Learned rule (v2):** "If verification fails multiple times, escalate the issue to a human for further assistance."
- **Exam still fails:** the rule fixed verification, not emergencies. The hidden exam correctly showed the fix did not generalise to a different kind of failure.

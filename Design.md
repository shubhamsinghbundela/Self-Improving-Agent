# Design Note

## Key design choices

- **Safety lives in code, not only in the prompt.** `verifiedPatientId` is kept in conversation state; tools read the patient from state, so the agent cannot book or cancel for someone else even if the LLM tries.
- **Small, scoped tools.** Six tools, one job each. Booking/cancel need a verified patient and an explicit confirmation.
- **Structured fake DB, no RAG.** Data is small and exact; scheduling needs exact matches, not similarity search. Fresh DB every run.
- **Versioned prompts** (`prompts/v1.md`, `v2.md` ...). Emergency handling was left out of v1 on purpose, so the eval has a real failure to find.
- **Agent loop caps tool calls per turn** and always answers every tool call, so it can't run away.

## Eval harness

- **Scenarios are data:** `persona`, `goal`, `expect` (answer key), `judgeCriteria`. One scorer works for all.
- **LLM fake patient** plays the persona, knows today's date, and stops on `DONE` or after 10 turns.
- **Hard checks on state and tool log:** verified patient, `mustCall`, `mustNotCall`, new bookings, cancelled IDs, escalation.
- **Where a transcript-only judge is blind:** the agent can _say_ "please contact the clinic" without calling `escalate_to_human`, or try an unsafe tool that errors and leaves no trace in the chat. Our v1 failure was exactly this, and only the tool log caught it.
- **Practice / exam split:** improver sees practice only; exam stays hidden to measure generalisation.

## Improvement loop (`bun run eval`)

1. Run all scenarios on the current prompt and score them.
2. Send practice failures (failed checks, tools called, transcript) to an improver LLM.
3. It returns `{ rootCause, newRule }` (Zod-validated); the rule must be general (no names, IDs, dates).
4. Write the next prompt version with the rule under `## Learned rules`, then re-run the **same** scenarios.
5. Accept only if practice score goes up **and** nothing that passed before now fails.

## Before / after

|          | v1  | v2  | v3   |
| -------- | --- | --- | ---- |
| Practice | 2/3 | 3/3 | TODO |
| Exam     | 0/1 | 0/1 | TODO |

- v1 → v2: learned "if verification fails multiple times, escalate to a human". No regressions.
- Exam stayed 0/1: the rule fixed verification, not emergencies. The hidden set correctly showed it did not generalise. To fix it without hand-editing the prompt, a practice emergency scenario (stroke signs) was added, so the loop learns emergency handling and chest pain stays the unseen test.

## One change for a real clinic

Stronger identity check (OTP to the registered phone) instead of name + DOB, plus a human approving every learned rule before it reaches patients.

## AI vs my judgment

- **AI helped:** most of the code, first drafts of scenarios, the scorer and the improver.
- **I cut** AI's larger scenario schema (exact slots, escalation counts) to keep it simple and less brittle.
- **I caught** a non-existent tool name (`book_appointment` → `book_slot`) and added `search_slots` to the booking flow.
- **I tightened** `mustNotCall` (no search/escalate on a simple cancel; no listing after failed verification) and decided failed verification should escalate to staff.
- **I caught simulator bugs from the logs:** the patient arguing about "2026" (no date), chats looping to max turns, and `DONE` without brackets not stopping the chat.

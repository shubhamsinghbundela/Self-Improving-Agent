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

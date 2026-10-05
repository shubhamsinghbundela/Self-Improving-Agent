# Self-Improving Clinic Scheduling Agent

A patient-appointment scheduling agent, plus an eval harness that finds the agent's failures, turns them into a prompt fix, and re-runs to prove the score went up without breaking anything.

## Setup

```bash
bun install
```

Create a `.env` file:

```
OPENAI_API_KEY=your-key-here
```

## Run

```bash
bun run chat   # talk to the agent yourself
bun run eval   # run the full improvement loop (v1 -> v2)
```

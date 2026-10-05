import { z } from "zod";

export const ScenarioSchema = z.object({
  id: z.string(),
  split: z.enum(["train", "heldout"]),
  persona: z.string(),
  goal: z.string(),
  expect: z.object({
    verifiedPatientId: z.string().nullable(),
    mustCall: z.array(z.string()).default([]),
    mustNotCall: z.array(z.string()).default([]),
    newBookings: z.number().default(0),
    cancelled: z.array(z.string()).default([]),
    escalate: z.boolean().default(false),
  }),
  judgeCriteria: z.array(z.string()).default([]),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

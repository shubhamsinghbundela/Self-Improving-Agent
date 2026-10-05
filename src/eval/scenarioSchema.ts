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
    newBookings: z.number(),
    newBookingDates: z.array(z.string()).optional(),
    newBookingSlots: z
      .array(z.object({ doctor: z.string(), datetime: z.string() }))
      .optional(),
    cancelled: z.array(z.string()).default([]),
    stillBooked: z.array(z.string()).default([]),
    minEscalations: z.number().default(0),
  }),
  judgeCriteria: z.array(z.string()).default([]),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

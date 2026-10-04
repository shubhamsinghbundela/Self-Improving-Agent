import { z } from "zod";
import { zodFunction } from "openai/helpers/zod";

import type { ConversationState } from "../../types";
import {
  VerifyInput,
  SearchInput,
  BookInput,
  CancelInput,
  ListInput,
  EscalateInput,
} from "./schemas";

import {
  verifyPatient,
  searchSlots,
  bookSlot,
  listMyAppointments,
  cancelAppointment,
  escalateToHuman,
  type Result,
} from "./handlers";

type ToolDefinition = {
  schema: z.ZodType<any>;
  description: string;
  run: (state: ConversationState, args: any) => Result;
};

export const TOOLS: Record<string, ToolDefinition> = {
  verify_patient: {
    schema: VerifyInput,
    description:
      "Verify the patient's identity using full name and date of birth. Required before booking, cancelling or listing appointments.",
    run: verifyPatient,
  },
  search_slots: {
    schema: SearchInput,
    description:
      "Find available appointment slots on a given future date. Only offer slots returned by this tool.",
    run: searchSlots,
  },
  book_slot: {
    schema: BookInput,
    description:
      "Book an available slot for the verified patient. Only call after the patient confirmed the exact slot.",
    run: bookSlot,
  },
  list_my_appointments: {
    schema: ListInput,
    description: "List the verified patient's own upcoming appointments.",
    run: (state) => listMyAppointments(state),
  },
  cancel_appointment: {
    schema: CancelInput,
    description:
      "Cancel one of the verified patient's own appointments. Only call after the patient confirmed.",
    run: cancelAppointment,
  },
  escalate_to_human: {
    schema: EscalateInput,
    description:
      "Hand off to clinic staff for emergencies, medical questions, or anything outside scheduling.",
    run: escalateToHuman,
  },
};

export const toolDefinitions = Object.entries(TOOLS).map(([toolName, tool]) =>
  zodFunction({
    name: toolName,
    parameters: tool.schema,
    description: tool.description,
  }),
);

import { z } from "zod";

// NOTE: kisi bhi schema mein patientId nahi hai. Patient hamesha state se aata hai.

export const VerifyInput = z.object({
  name: z.string().describe("Patient's full name"),
  dob: z.string().describe("Date of birth, YYYY-MM-DD"),
});

export const SearchInput = z.object({
  date: z.string().describe("Date to search, YYYY-MM-DD"),
  doctor: z
    .string()
    .nullable()
    .describe("Doctor name to filter by, or null for all doctors"),
});

export const BookInput = z.object({
  slotId: z.string().describe("Slot id exactly as returned by search_slots"),
});

export const CancelInput = z.object({
  appointmentId: z
    .string()
    .describe("Appointment id from list_my_appointments"),
});

export const ListInput = z.object({});

export const EscalateInput = z.object({
  reason: z.string().describe("Why a human or emergency help is needed"),
});

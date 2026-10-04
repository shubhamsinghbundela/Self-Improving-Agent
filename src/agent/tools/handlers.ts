import { z } from "zod";
import { CONFIG } from "../../config";
import type { ConversationState } from "../../types";
import {
  VerifyInput,
  SearchInput,
  BookInput,
  CancelInput,
  EscalateInput,
} from "./schemas";

export type Result = { ok: boolean; [key: string]: unknown };

const MAX_FAILED_VERIFICATIONS = 3;

export function verifyPatient(
  state: ConversationState,
  args: z.infer<typeof VerifyInput>,
): Result {
  if (state.failedVerifications >= MAX_FAILED_VERIFICATIONS) {
    return {
      ok: false,
      error: "Too many failed attempts. Ask the patient to call the clinic.",
    };
  }

  const matchedPatient = state.db.patients.find(
    (patient) =>
      patient.name.toLowerCase() === args.name.trim().toLowerCase() &&
      patient.dob === args.dob.trim(),
  );

  if (!matchedPatient) {
    state.failedVerifications++;
    // Generic error: yeh nahi batate ki naam sahi tha ya DOB
    return { ok: false, error: "Could not verify patient with those details." };
  }

  state.verifiedPatientId = matchedPatient.id;
  return { ok: true, message: `Verified ${matchedPatient.name}` };
}

export function searchSlots(
  state: ConversationState,
  args: z.infer<typeof SearchInput>,
): Result {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    return { ok: false, error: "Date must be YYYY-MM-DD" };
  }
  if (args.date <= CONFIG.today) {
    return { ok: false, error: "Only future dates can be booked." };
  }

  const availableSlots = state.db.slots
    .filter((slot) => slot.datetime.startsWith(args.date) && !slot.isBooked)
    .filter(
      (slot) =>
        !args.doctor ||
        slot.doctor.toLowerCase().includes(args.doctor.toLowerCase()),
    )
    .map((slot) => ({
      slotId: slot.id,
      doctor: slot.doctor,
      datetime: slot.datetime,
    }));

  return { ok: true, count: availableSlots.length, slots: availableSlots };
}

export function bookSlot(
  state: ConversationState,
  args: z.infer<typeof BookInput>,
): Result {
  if (!state.verifiedPatientId)
    return { ok: false, error: "Patient not verified." };

  const slot = state.db.slots.find((s) => s.id === args.slotId);
  if (!slot) return { ok: false, error: "Slot not found." };
  if (slot.isBooked) return { ok: false, error: "Slot already booked." };

  slot.isBooked = true;
  const appointmentId = `a${state.db.appointments.length + 1}`;
  state.db.appointments.push({
    id: appointmentId,
    patientId: state.verifiedPatientId,
    slotId: slot.id,
    status: "booked",
  });

  return {
    ok: true,
    appointmentId,
    doctor: slot.doctor,
    datetime: slot.datetime,
  };
}

export function listMyAppointments(state: ConversationState): Result {
  if (!state.verifiedPatientId)
    return { ok: false, error: "Patient not verified." };

  const myAppointments = state.db.appointments
    .filter(
      (appointment) =>
        appointment.patientId === state.verifiedPatientId &&
        appointment.status === "booked",
    )
    .map((appointment) => {
      const slot = state.db.slots.find((s) => s.id === appointment.slotId)!;
      return {
        appointmentId: appointment.id,
        doctor: slot.doctor,
        datetime: slot.datetime,
      };
    });

  return { ok: true, appointments: myAppointments };
}

export function cancelAppointment(
  state: ConversationState,
  args: z.infer<typeof CancelInput>,
): Result {
  if (!state.verifiedPatientId)
    return { ok: false, error: "Patient not verified." };

  const appointment = state.db.appointments.find(
    (a) =>
      a.id === args.appointmentId &&
      a.patientId === state.verifiedPatientId &&
      a.status === "booked",
  );

  if (!appointment) {
    return { ok: false, error: "Appointment not found for this patient." };
  }

  appointment.status = "cancelled";
  const slot = state.db.slots.find((s) => s.id === appointment.slotId)!;
  slot.isBooked = false;

  return { ok: true, message: "Appointment cancelled." };
}

export function escalateToHuman(
  state: ConversationState,
  args: z.infer<typeof EscalateInput>,
): Result {
  state.db.escalations.push({ reason: args.reason });
  return { ok: true, message: "Clinic staff have been notified." };
}

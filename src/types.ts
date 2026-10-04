export type Patient = {
  id: string;
  name: string;
  dob: string; // "YYYY-MM-DD"
};

export type Slot = {
  id: string;
  doctor: string;
  datetime: string; // "2026-10-06T11:00"
  isBooked: boolean;
};

export type Appointment = {
  id: string;
  patientId: string;
  slotId: string;
  status: "booked" | "cancelled";
};

export type DB = {
  patients: Patient[];
  slots: Slot[];
  appointments: Appointment[];
  escalations: { reason: string }[];
};

export type ToolCall = {
  name: string;
  input: unknown;
  output: unknown;
  ok: boolean; // tool successful hua ya error aaya
};

export type ConversationState = {
  db: DB;
  verifiedPatientId: string | null;
  messages: any[]; // OpenAI messages
  toolLog: ToolCall[];
};

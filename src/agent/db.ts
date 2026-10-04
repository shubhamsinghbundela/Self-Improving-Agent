import type { DB, Slot } from "../types";

const DOCTORS = ["Dr. Mehta", "Dr. Rao"];

// Mon 2026-10-05 Fri 2026-10-09. "today" = 2026-10-04
const DAYS = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];
const TIMES = ["10:00", "11:00", "15:00"];

//  Full day slot booked ("no slots available" scenario)
const FULL_DAY = "2026-10-08";

export function createDb(): DB {
  const slots: Slot[] = [];
  let n = 1;

  for (const day of DAYS) {
    for (const doctor of DOCTORS) {
      for (const time of TIMES) {
        slots.push({
          id: `s${n++}`,
          doctor,
          datetime: `${day}T${time}`,
          isBooked: day === FULL_DAY,
        });
      }
    }
  }

  const slotAt = (doctor: string, datetime: string) =>
    slots.find((s) => s.doctor === doctor && s.datetime === datetime)!;

  const anitaSlot = slotAt("Dr. Mehta", "2026-10-07T11:00");
  anitaSlot.isBooked = true;

  const raviSlot = slotAt("Dr. Rao", "2026-10-06T10:00");
  raviSlot.isBooked = true;

  return {
    patients: [
      { id: "p1", name: "Ravi Kumar", dob: "1980-05-12" },
      { id: "p2", name: "Anita Sharma", dob: "1992-11-03" },
      { id: "p3", name: "Suresh Patel", dob: "1975-02-27" },
      { id: "p4", name: "Meera Iyer", dob: "1988-08-19" },
    ],
    slots,
    appointments: [
      { id: "a1", patientId: "p1", slotId: raviSlot.id, status: "booked" },
      { id: "a2", patientId: "p2", slotId: anitaSlot.id, status: "booked" },
    ],
    escalations: [],
  };
}

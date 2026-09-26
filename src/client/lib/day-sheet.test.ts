import assert from "node:assert/strict";
import { test } from "node:test";
import type { Appointment, BlockedSlot } from "../types.ts";
import { buildDaySheetCsv } from "./day-sheet.ts";

function appointment(patch: Partial<Appointment> = {}): Appointment {
  return {
    id: 1,
    identifier: "APT-1",
    client_id: 1,
    staff_id: 1,
    status: "confirmed",
    scheduled_date: "2026-09-26",
    start_time: "10:00",
    end_time: "11:00",
    total_price: 65,
    notes: "Prefers a quiet appointment",
    is_recurring: 0,
    recurrence_interval: "",
    client_name: "Jamie Rivera",
    client_phone: "555-0100",
    staff_name: "Maya Chen",
    appointment_services: [{
      id: 1,
      appointment_id: 1,
      service_id: 1,
      service_name: "Cut, style",
      price: 65,
      duration: 60,
    }],
    created_at: "2026-09-01 09:00:00",
    updated_at: "2026-09-01 09:00:00",
    ...patch,
  };
}

function blocked(patch: Partial<BlockedSlot> = {}): BlockedSlot {
  return {
    id: 1,
    staff_id: 1,
    staff_name: "Maya Chen",
    blocked_date: "2026-09-26",
    start_time: "09:00",
    end_time: "09:30",
    reason: "Team meeting",
    created_at: "2026-09-01 09:00:00",
    ...patch,
  };
}

test("a day sheet includes blocked time and full appointment details in time order", () => {
  const csv = buildDaySheetCsv("2026-09-26", [appointment()], [blocked()]);
  const lines = csv.trimEnd().split("\r\n");

  assert.equal(lines.length, 3);
  assert.match(lines[1], /"09:00","09:30","Blocked time"/);
  assert.match(lines[1], /"Team meeting"$/);
  assert.match(lines[2], /"APT-1","Maya Chen","Jamie Rivera","555-0100"/);
  assert.match(lines[2], /"Cut, style","confirmed","Prefers a quiet appointment"$/);
});

test("an empty day still exports a useful header row", () => {
  const csv = buildDaySheetCsv("2026-09-26", [], []);
  assert.equal(csv.split("\r\n").filter(Boolean).length, 1);
  assert.match(csv, /^"Date","Start","End","Type"/);
});

test("spreadsheet formulas and CSV punctuation remain data", () => {
  const csv = buildDaySheetCsv("2026-09-26", [appointment({
    client_name: "=HYPERLINK(\"https://example.com\")",
    notes: "Line one, \"quoted\"\nLine two",
  })], []);

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.com""\)"/);
  assert.match(csv, /"Line one, ""quoted""\nLine two"/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { before, test } from "node:test";

// Bundle the real routes with Vite's own bundler, then exercise them against
// SQLite through the same StorageBinding contract used by the hosted app.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("vite"))("esbuild");
let bundle: string;
let scenario = 0;
before(async () => {
  const result = await build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true, platform: "node", format: "esm", write: false,
  });
  bundle = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
});

async function setup(t: { after: (fn: () => void) => void }) {
  const { default: app } = await import(`${bundle}#${scenario++}`);
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  const env = { STORAGE: { async query(sql: string, params: any[] = []) {
    const stmt = db.prepare(sql);
    if (stmt.columns().length) return { rows: stmt.all(...params) };
    const result = stmt.run(...params);
    return { rows: [], meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
  } } };
  const call = async (method: string, path: string, body?: object) => {
    const response = await app.request(path, {
      method, headers: { "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }, env);
    return { status: response.status, body: await response.json() };
  };
  const create = (patch: object = {}) => call("POST", "/api/appointments", {
    client_id: 1, staff_id: 1, scheduled_date: "2026-09-14", start_time: "10:00", service_ids: [1], ...patch,
  });
  const update = (id: number, patch: object) => call("PUT", `/api/appointments/${id}`, patch);
  return { db, call, create, update };
}

test("routes reject overlaps, permit adjacent slots, and expose conflicts to agents", async (t) => {
  const { create, call } = await setup(t);
  assert.equal((await create()).status, 201);
  for (const start_time of ["10:00", "10:30", "09:30"]) {
    const rejected = await create({ start_time });
    assert.equal(rejected.status, 409);
    assert.equal(rejected.body.conflicts[0].kind, "appointment");
  }
  assert.equal((await create({ start_time: "11:00" })).status, 201);
  assert.equal((await create({ staff_id: 2 })).status, 201);
  assert.equal((await create({ staff_id: null })).status, 201);
  assert.equal((await create({ scheduled_date: "2026-09-15" })).status, 201);
  const schema = await call("GET", "/api/openapi.json");
  assert.ok(schema.body.paths["/api/appointments"].post.responses[409]);
  assert.ok(schema.body.paths["/api/appointments"].post.responses[400]);
});

test("a deliberate overlap can be edited, checked in, completed, and cancelled", async (t) => {
  const { create, update, db } = await setup(t);
  await create();
  const { body } = await create({ client_id: 2, allow_conflict: true });
  const id = body.appointment.id;
  assert.equal((await update(id, { notes: "Quiet appointment", total_price: 45 })).status, 200);
  for (const status of ["checked_in", "completed", "cancelled"]) {
    assert.equal((await update(id, { status })).status, 200, status);
  }
  assert.equal(db.prepare("SELECT status FROM appointments WHERE id = ?").get(id)?.status, "cancelled");
  assert.equal((await update(id, { status: "booked" })).status, 409, "restoring occupies the slot again");
  assert.equal((await update(id, { status: "booked", allow_conflict: true })).status, 200);
});

test("cancelled bookings do not occupy the chair, even when reassigned", async (t) => {
  const { create, update } = await setup(t);
  const first = await create();
  assert.equal((await update(first.body.appointment.id, { status: "cancelled" })).status, 200);
  assert.equal((await create()).status, 201);
  assert.equal((await create({ staff_id: 2 })).status, 201);
  assert.equal((await update(first.body.appointment.id, { staff_id: 2 })).status, 200);
  assert.equal((await update(first.body.appointment.id, { status: "booked" })).status, 409);
});

test("rescheduling preserves duration and rejects an occupied staff member", async (t) => {
  const { create, update, db } = await setup(t);
  const first = await create();
  const id = first.body.appointment.id;
  assert.equal((await update(id, { start_time: "11:00" })).status, 200);
  assert.equal(db.prepare("SELECT end_time FROM appointments WHERE id = ?").get(id)?.end_time, "12:00");
  await create({ staff_id: 2, start_time: "11:00" });
  assert.equal((await update(id, { staff_id: 2 })).status, 409);
  assert.equal((await update(id, { staff_id: 2, allow_conflict: true })).status, 200);
  assert.equal((await update(9999, { notes: "Missing" })).status, 404);
});

test("blocked time rejects new and moved appointments", async (t) => {
  const { create, update, db } = await setup(t);
  const first = await create(); // also runs the application's seed middleware
  db.prepare("INSERT INTO blocked_slots (staff_id, blocked_date, start_time, end_time, reason) VALUES (1, '2026-09-14', '13:00', '14:00', 'Lunch')").run();
  const blocked = await create({ start_time: "13:00" });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.conflicts[0].kind, "blocked");
  assert.equal((await update(first.body.appointment.id, { start_time: "13:00" })).status, 409);
});

test("invalid times and midnight overflow cannot bypass the guard, even with an override", async (t) => {
  const { create, update, db } = await setup(t);
  for (const start_time of ["", "noon", "09:30garbage", "24:00", "23:30"]) {
    assert.equal((await create({ start_time, allow_conflict: true })).status, 400, start_time);
  }
  assert.equal((await create({ service_ids: [9999] })).status, 400);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM appointments").get()?.count, 0);
  const first = await create();
  assert.equal((await update(first.body.appointment.id, { start_time: "23:30" })).status, 400);
  assert.equal((await update(first.body.appointment.id, { end_time: "09:00" })).status, 400);
  assert.equal((await update(first.body.appointment.id, { end_time: "11:00garbage" })).status, 400);
  assert.equal(db.prepare("SELECT start_time FROM appointments WHERE id = ?").get(first.body.appointment.id)?.start_time, "10:00");
});

test("legacy invalid times do not prevent cancellation or metadata repair", async (t) => {
  const { create, update, db } = await setup(t);
  const first = await create();
  const id = first.body.appointment.id;
  db.prepare("UPDATE appointments SET end_time = start_time WHERE id = ?").run(id);
  assert.equal((await update(id, { notes: "Needs rescheduling" })).status, 200);
  assert.equal((await update(id, { status: "cancelled" })).status, 200);
  assert.equal((await update(id, { status: "booked" })).status, 400);
  assert.equal((await update(id, { status: "booked", end_time: "11:00" })).status, 200);
});

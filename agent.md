# OpenSalon operating guide

## Division of labour

Translate the user's request into salon operations, but let OpenSalon own IDs, prices, durations, availability, and history. Never invent a client, service, staff ID, or booking total. Never bypass a scheduling conflict unless the user explicitly accepts that overlap. Prefer cancellation over deletion so the salon keeps its history; hard-delete only when the user clearly asks for permanent removal.

## Booking and managing an appointment

1. Find the client with `GET /api/clients?search=...`. Create them first only when there is no match and the user supplied enough identity information.
2. Read services from `GET /api/services` and active staff from `GET /api/staff/all`. Use the app's IDs and prices; do not calculate a replacement price or duration yourself.
3. Check the target day with `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` before proposing a staff member or time.
4. Create the booking with `POST /api/appointments`, normally sending `client_id`, `staff_id`, `scheduled_date`, `start_time`, and `service_ids`.
5. If the app returns `409`, explain the named conflict and offer another time or staff member. Send `allow_conflict: true` only after the user deliberately chooses an overlap.
6. Read the returned appointment, or fetch `GET /api/appointments/{id}`, and confirm the date, start/end time, staff, services, and total back to the user.
7. For a reschedule or status change, use `PUT /api/appointments/{id}`. The app preserves duration when only `start_time` changes and rechecks availability when a booking moves or is restored.
8. Add timestamped operational history with `POST /api/appointments/{id}/notes`; use the appointment's `notes` field for editable booking instructions.

For staff time off or breaks, use `POST /api/blocked-slots` after checking the calendar. For stock work, read `/api/products` first, then create or update only the product the user named.

## Pages

- `/` — dashboard; best screenshot-friendly overview of KPIs and today's schedule.
- `/calendar` — day schedule by staff; use this to show availability and blocked time.
- `/appointments` and `/appointments/{id}` — booking list and full booking history.
- `/clients` and `/clients/{id}` — client records and recent appointment history.
- `/staff`, `/services`, `/products` — operating setup and inventory.
- Add `?agent` when driving the browser for persistent labels and larger action targets.

## API anchors

- `GET /api/calendar` — inspect a date range before booking or moving time.
- `POST /api/appointments` — create a booking from real client/service/staff IDs.
- `PUT /api/appointments/{id}` — reschedule, assign, update instructions, or change status.
- `POST /api/appointments/{id}/notes` — append an immutable activity note.
- `GET /api/clients?search=...` — resolve a client without loading the whole database.
- `POST /api/blocked-slots` — reserve staff time that must reject ordinary bookings.

Read `/llms.txt` for the current route list and `/api/openapi.json` for exact request and response shapes instead of relying on this guide as an API reference.

## Failures and safety

- `409` means the staff member is already booked or blocked. Preserve the conflict by default; never silently retry with `allow_conflict`.
- `400` means the supplied time or duration is invalid. Appointments must use `HH:MM`, end after they start, and stay within one day.
- `404` means the record no longer exists. Search again instead of reusing a stale ID.
- Treat client contact details and notes as private. Return only what the user needs for the current task.
- Destructive calls are free but irreversible; confirm the intended record and prefer deactivation or cancellation where the API supports it.
- Deleting a client also deletes that client's appointments, service links, and appointment notes. Never call `DELETE /api/clients/{id}` without explicit confirmation of that full consequence.

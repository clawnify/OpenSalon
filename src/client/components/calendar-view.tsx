import { useState } from "preact/hooks";
import { useApp } from "../context";
import type { Appointment, BlockedSlot } from "../types";
import { ChevronLeft, ChevronRight, Plus, X, Ban } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateAppointment } from "./create-appointment";
import { cn } from "@/lib/utils";
import { packLanes } from "@/lib/overlap";
import { parseDate, shiftDate, today } from "@/lib/dates";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Lay a column's appointments and blocked slots out side by side.
 *
 * Blocked time is packed together with the bookings because it competes for the
 * same person: drawing a booking over the top of a lunch break hid the break.
 */
function layOutColumn(
  appointments: Appointment[],
  blocked: BlockedSlot[],
  dayStart: number,
) {
  return packLanes([
    ...blocked.map((b) => ({
      key: `b-${b.id}`, block: b, appointment: null as Appointment | null,
      start: timeToMinutes(b.start_time) - dayStart,
      end: timeToMinutes(b.end_time) - dayStart,
    })),
    ...appointments.map((a) => ({
      key: `a-${a.id}`, block: null as BlockedSlot | null, appointment: a,
      start: timeToMinutes(a.start_time) - dayStart,
      end: timeToMinutes(a.end_time) - dayStart,
    })),
  ]);
}

/** Where a laid-out span sits across the width of its column. */
function laneStyle(lane: number, lanes: number) {
  const width = 100 / lanes;
  return { left: `calc(${lane * width}% + 4px)`, width: `calc(${width}% - 8px)` };
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export function CalendarView() {
  const {
    calendarAppointments, calendarBlocked, calendarDate, setCalendarDate,
    staffLookup, navigate, deleteBlockedSlot, addBlockedSlot, isAgent,
  } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStaff, setBlockStaff] = useState("");
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("");

  const dateObj = parseDate(calendarDate);
  const todayStr = today();

  const shiftDay = (delta: number) => setCalendarDate(shiftDate(calendarDate, delta));

  const dayStart = HOURS[0] * 60;
  const dayEnd = (HOURS[HOURS.length - 1] + 1) * 60;
  const totalMinutes = dayEnd - dayStart;
  const hourHeight = 64;
  const totalHeight = (totalMinutes / 60) * hourHeight;

  const handleAddBlock = async () => {
    if (!blockStaff) return;
    await addBlockedSlot({
      staff_id: parseInt(blockStaff),
      blocked_date: calendarDate,
      start_time: blockStart,
      end_time: blockEnd,
      reason: blockReason,
    });
    setShowBlockForm(false);
    setBlockReason("");
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <Button variant="outline" size="sm" className="h-11" onClick={() => setCalendarDate(todayStr)}>Today</Button>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Previous day" onClick={() => shiftDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 text-center text-sm font-semibold sm:min-w-[200px]" aria-live="polite" aria-atomic="true">
            {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Next day" onClick={() => shiftDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" size="sm" className="h-11 flex-1 sm:flex-none" aria-expanded={showBlockForm} aria-controls="calendar-block-time" onClick={() => setShowBlockForm(!showBlockForm)}>
            <Ban className="h-3.5 w-3.5" /> Block Time
          </Button>
          <Button size="sm" className="h-11 flex-1 sm:flex-none" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New Booking
          </Button>
        </div>
      </div>

      {showBlockForm && (
        <Card id="calendar-block-time" className="shrink-0">
          <CardContent className="grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-4 xl:flex xl:flex-wrap">
            <div className="col-span-2 min-w-0 space-y-1 xl:w-48">
              <Label htmlFor="block-staff" className="text-xs">Staff</Label>
              <select id="block-staff" className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={blockStaff} onChange={(e) => setBlockStaff((e.target as HTMLSelectElement).value)}>
                <option value="">Select staff...</option>
                {staffLookup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="min-w-0 space-y-1 xl:w-28">
              <Label htmlFor="block-start" className="text-xs">Start</Label>
              <Input id="block-start" type="time" className="h-11 w-full min-w-0" value={blockStart} onChange={(e) => setBlockStart((e.target as HTMLInputElement).value)} />
            </div>
            <div className="min-w-0 space-y-1 xl:w-28">
              <Label htmlFor="block-end" className="text-xs">End</Label>
              <Input id="block-end" type="time" className="h-11 w-full min-w-0" value={blockEnd} onChange={(e) => setBlockEnd((e.target as HTMLInputElement).value)} />
            </div>
            <div className="col-span-2 min-w-0 space-y-1 xl:flex-1">
              <Label htmlFor="block-reason" className="text-xs">Reason</Label>
              <Input id="block-reason" className="h-11" placeholder="e.g. Lunch break" value={blockReason} onChange={(e) => setBlockReason((e.target as HTMLInputElement).value)} />
            </div>
            <Button size="sm" className="col-span-2 h-11" onClick={handleAddBlock}>Add Block</Button>
          </CardContent>
        </Card>
      )}

      {showCreate && <CreateAppointment onClose={() => setShowCreate(false)} defaultDate={calendarDate} />}

      <div className="flex min-h-80 min-w-0 flex-1 overflow-auto rounded-lg border bg-card" role="region" aria-label="Daily staff schedule" tabIndex={0}>
        {/* Time gutter */}
        <div className="w-16 flex-shrink-0 border-r bg-muted/30 pt-10">
          {HOURS.map((h) => (
            <div key={h} className="flex h-16 items-start justify-end pr-2 text-xs text-muted-foreground" style={{ height: hourHeight }}>
              {formatHour(h)}
            </div>
          ))}
        </div>

        {/* Staff columns */}
        <div className="flex flex-1">
          {staffLookup.map((member) => {
            const memberAppts = calendarAppointments.filter((a) => a.staff_id === member.id);
            const memberBlocked = calendarBlocked.filter((b) => b.staff_id === member.id);
            return (
              <div key={member.id} className="flex min-w-[180px] flex-1 flex-col border-r last:border-r-0">
                <div className="flex items-center justify-center gap-2 border-b bg-muted/20 px-3 py-2.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: member.color }} />
                  <span className="text-sm font-medium">{member.name}</span>
                </div>
                <div className="relative" style={{ height: totalHeight }}>
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-dashed border-border/50"
                      style={{ top: ((h * 60 - dayStart) / totalMinutes) * totalHeight }}
                    />
                  ))}

                  {layOutColumn(memberAppts, memberBlocked, dayStart).map((item) => {
                    const top = (item.start / totalMinutes) * totalHeight;
                    const height = ((item.end - item.start) / totalMinutes) * totalHeight;
                    const lane = laneStyle(item.lane, item.lanes);

                    if (item.block) {
                      const block = item.block;
                      return (
                        <div
                          key={item.key}
                          className="absolute z-10 flex items-center justify-between rounded bg-muted/60 px-2 text-xs text-muted-foreground"
                          style={{ ...lane, top, height: Math.max(height, 20) }}
                        >
                          <span className="truncate">{block.reason || "Blocked"}</span>
                          <button
                            className="flex-shrink-0 rounded p-0.5 hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); deleteBlockedSlot(block.id); }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    }

                    const apt = item.appointment!;
                    const services = apt.appointment_services?.map((s) => s.service_name).filter(Boolean).join(", ");
                    return (
                      <button
                        key={item.key}
                        className={cn(
                          "absolute z-20 cursor-pointer overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left transition-shadow hover:shadow-md",
                        )}
                        style={{
                          ...lane,
                          top,
                          height: Math.max(height, 28),
                          backgroundColor: `${member.color}14`,
                          borderLeftColor: member.color,
                        }}
                        onClick={() => navigate(`/appointments/${apt.id}`)}
                        title={`${apt.start_time} - ${apt.end_time} ${apt.client_name ?? ""}`}
                      >
                        <div className="text-[10px] font-medium text-muted-foreground">{apt.start_time} - {apt.end_time}</div>
                        <div className="truncate text-xs font-semibold">{apt.client_name}</div>
                        {services && height > 50 && <div className="truncate text-[10px] text-muted-foreground">{services}</div>}
                        {height > 40 && <div className="text-[10px] font-medium">${apt.total_price.toFixed(2)}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Unassigned column */}
          {(() => {
            const unassigned = calendarAppointments.filter((a) => !a.staff_id);
            if (unassigned.length === 0) return null;
            return (
              <div className="flex min-w-[180px] flex-1 flex-col border-r last:border-r-0">
                <div className="flex items-center justify-center gap-2 border-b bg-muted/20 px-3 py-2.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/40" />
                  <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                </div>
                <div className="relative" style={{ height: totalHeight }}>
                  {HOURS.map((h) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-dashed border-border/50" style={{ top: ((h * 60 - dayStart) / totalMinutes) * totalHeight }} />
                  ))}
                  {layOutColumn(unassigned, [], dayStart).map((item) => {
                    const apt = item.appointment!;
                    const top = (item.start / totalMinutes) * totalHeight;
                    const height = ((item.end - item.start) / totalMinutes) * totalHeight;
                    return (
                      <button
                        key={item.key}
                        className="absolute z-20 cursor-pointer overflow-hidden rounded-md border-l-[3px] border-l-muted-foreground/40 bg-muted/30 px-2 py-1 text-left transition-shadow hover:shadow-md"
                        style={{ ...laneStyle(item.lane, item.lanes), top, height: Math.max(height, 28) }}
                        onClick={() => navigate(`/appointments/${apt.id}`)}
                      >
                        <div className="text-[10px] font-medium text-muted-foreground">{apt.start_time} - {apt.end_time}</div>
                        <div className="truncate text-xs font-semibold">{apt.client_name}</div>
                        <div className="text-[10px] font-medium">${apt.total_price.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

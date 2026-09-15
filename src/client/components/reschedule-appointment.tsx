import { useState } from "preact/hooks";
import { useApp } from "../context";
import type { Appointment } from "../types";
import { conflictsFrom, describeConflict, type Conflict } from "@/lib/conflicts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function RescheduleAppointment({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { updateAppointment } = useApp();
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const [date, setDate] = useState(appointment.scheduled_date);
  const [startTime, setStartTime] = useState(appointment.start_time);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const unchanged = date === appointment.scheduled_date && startTime === appointment.start_time;

  const clearFeedback = () => { setError(null); setConflicts(null); };
  const close = () => { if (!saving) onClose(); };
  const submit = async (allowConflict: boolean) => {
    if (saving || unchanged) return;
    setSaving(true);
    clearFeedback();
    try {
      await updateAppointment(appointment.id, {
        scheduled_date: date,
        start_time: startTime,
        ...(allowConflict ? { allow_conflict: true } : {}),
      });
      onClose();
    } catch (err) {
      const clashes = conflictsFrom(err);
      if (clashes) setConflicts(clashes);
      else setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" onCloseAutoFocus={(event: Event) => {
        event.preventDefault();
        opener?.focus();
      }}>
        <DialogHeader>
          <DialogTitle>Reschedule booking</DialogTitle>
          <DialogDescription>
            {appointment.client_name} · {appointment.identifier}. Choose a new date and time. The booking keeps its duration, services and staff.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}>
          <p className="text-sm text-muted-foreground">
            Currently {appointment.scheduled_date}, {appointment.start_time}–{appointment.end_time}
            {appointment.staff_name ? ` with ${appointment.staff_name}` : " · Unassigned"}
          </p>
          <fieldset disabled={saving} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input id="reschedule-date" type="date" required value={date} onChange={(e: Event) => {
                setDate((e.target as HTMLInputElement).value); clearFeedback();
              }} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="reschedule-time">Start time</Label>
              <Input id="reschedule-time" type="time" required value={startTime} onChange={(e: Event) => {
                setStartTime((e.target as HTMLInputElement).value); clearFeedback();
              }} />
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {conflicts && (
            <div role="alert" className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">{appointment.staff_name || "That staff member"} is not free then.</p>
              <ul className="text-muted-foreground">
                {conflicts.map((conflict, index) => <li key={index}>{describeConflict(conflict)}</li>)}
              </ul>
              <p>Choose another time, or move it anyway.</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button>
            {conflicts && <Button type="button" variant="outline" disabled={saving} onClick={(event: MouseEvent) => {
              if ((event.currentTarget as HTMLButtonElement).form?.reportValidity()) submit(true);
            }}>Move anyway</Button>}
            <Button type="submit" disabled={saving || unchanged}>{saving ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

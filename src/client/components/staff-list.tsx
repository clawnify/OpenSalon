import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Trash2 } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateStaff } from "./create-staff";

export function StaffList() {
  const { staffMembers, deleteStaff, updateStaff } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <Button size="sm" className="min-h-11 sm:min-h-0" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Staff
        </Button>
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        All-time completed visits and booked service value. Service value is not payment received, tips, commission, or take-home pay.
      </p>

      {showCreate && <CreateStaff onClose={() => setShowCreate(false)} />}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y lg:hidden">
            {staffMembers.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">No staff members yet</p>
            )}
            {staffMembers.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ backgroundColor: s.color }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{s.name}</h2>
                      {!s.active && <span className="rounded-md bg-secondary px-2 py-0.5 text-sm text-secondary-foreground">Inactive</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{s.title || "No role set"}</p>
                    {(s.email || s.phone) && (
                      <p className="break-words text-sm text-muted-foreground">{[s.email, s.phone].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                  <div><dt className="text-sm text-muted-foreground">Bookings</dt><dd className="font-semibold tabular-nums">{s.appointment_count || 0}</dd></div>
                  <div><dt className="text-sm text-muted-foreground">Completed</dt><dd className="font-semibold tabular-nums">{s.completed_appointment_count || 0}</dd></div>
                  <div><dt className="text-sm text-muted-foreground">Service value</dt><dd className="font-semibold tabular-nums">${(s.completed_service_value || 0).toFixed(2)}</dd></div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="min-h-11" onClick={() => updateStaff(s.id, { active: s.active ? 0 : 1 })}>
                    {s.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="outline" className="min-h-11 text-destructive hover:text-destructive" onClick={() => deleteStaff(s.id)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-24 text-right">Bookings</TableHead>
                  <TableHead className="w-24 text-right">Completed</TableHead>
                  <TableHead className="w-36 text-right">Service value</TableHead>
                  <TableHead className="w-44" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No staff members yet</TableCell></TableRow>
                )}
                {staffMembers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: s.color }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.name}</span>
                            {!s.active && <span className="rounded-md bg-secondary px-2 py-0.5 text-sm text-secondary-foreground">Inactive</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">{s.email || s.phone || "No contact details"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.title || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.appointment_count || 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.completed_appointment_count || 0}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">${(s.completed_service_value || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateStaff(s.id, { active: s.active ? 0 : 1 })}>
                          {s.active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button aria-label={`Delete ${s.name}`} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteStaff(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarCheck, Check, X } from "lucide-react";
import { format } from "date-fns";

export default function Attendance() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [viewEmployeeId, setViewEmployeeId] = useState<string>("");

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attendanceForDate } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, employees(full_name, employee_id, department)")
        .eq("date", selectedDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: employeeHistory } = useQuery({
    queryKey: ["attendance-history", viewEmployeeId],
    queryFn: async () => {
      if (!viewEmployeeId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", viewEmployeeId)
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!viewEmployeeId,
  });

  const markMutation = useMutation({
    mutationFn: async ({ employee_id, status }: { employee_id: string; status: string }) => {
      const { error } = await supabase
        .from("attendance")
        .upsert({ employee_id, date: selectedDate, status }, { onConflict: "employee_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast.success("Attendance updated");
    },
    onError: () => toast.error("Failed to update attendance"),
  });

  const getStatus = (empId: string) => {
    return attendanceForDate?.find((a) => a.employee_id === empId)?.status;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-1">Track daily employee attendance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mark attendance */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  Mark Attendance
                </CardTitle>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
              </div>
            </CardHeader>
            <CardContent>
              {!employees?.length ? (
                <div className="text-center py-12 text-muted-foreground">No employees found. Add employees first.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => {
                      const status = getStatus(emp.id);
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.employee_id}</TableCell>
                          <TableCell>{emp.full_name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                              {emp.department}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant={status === "Present" ? "default" : "outline"}
                                className={status === "Present" ? "bg-success hover:bg-success/90" : ""}
                                onClick={() => markMutation.mutate({ employee_id: emp.id, status: "Present" })}
                                disabled={markMutation.isPending}
                              >
                                <Check className="h-3 w-3 mr-1" />P
                              </Button>
                              <Button
                                size="sm"
                                variant={status === "Absent" ? "default" : "outline"}
                                className={status === "Absent" ? "bg-destructive hover:bg-destructive/90" : ""}
                                onClick={() => markMutation.mutate({ employee_id: emp.id, status: "Absent" })}
                                disabled={markMutation.isPending}
                              >
                                <X className="h-3 w-3 mr-1" />A
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* View history */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg">Attendance History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Employee</Label>
                <Select value={viewEmployeeId} onValueChange={setViewEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                  <SelectContent>
                    {employees?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {viewEmployeeId && employeeHistory && (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {!employeeHistory.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No records found</p>
                  ) : (
                    employeeHistory.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                        <span>{format(new Date(rec.date), "MMM dd, yyyy")}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          rec.status === "Present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}>
                          {rec.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

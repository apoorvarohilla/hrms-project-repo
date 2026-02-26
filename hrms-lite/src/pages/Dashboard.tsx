import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarCheck, UserCheck, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-heading font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance-today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", today);
      if (error) throw error;
      return data;
    },
  });

  const totalEmployees = employees?.length ?? 0;
  const presentToday = todayAttendance?.filter((a) => a.status === "Present").length ?? 0;
  const absentToday = todayAttendance?.filter((a) => a.status === "Absent").length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your HR operations</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={totalEmployees} color="bg-primary/10 text-primary" />
        <StatCard icon={CalendarCheck} label="Attendance Marked" value={todayAttendance?.length ?? 0} color="bg-accent/10 text-accent" />
        <StatCard icon={UserCheck} label="Present Today" value={presentToday} color="bg-success/10 text-success" />
        <StatCard icon={UserX} label="Absent Today" value={absentToday} color="bg-destructive/10 text-destructive" />
      </div>
    </div>
  );
}

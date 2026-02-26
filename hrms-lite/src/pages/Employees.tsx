import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import { z } from "zod";
import { useDebounce } from "use-debounce";

const employeeSchema = z.object({
  employee_id: z.string().trim().min(1, "Employee ID is required").max(50),
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  department: z.string().min(1, "Department is required"),
});

const departments = [
  "Engineering",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Operations",
  "Design",
  "Product",
];

type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
};

export default function Employees() {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);

  const [form, setForm] = useState({
    employee_id: "",
    full_name: "",
    email: "",
    department: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* -------------------- FETCH EMPLOYEES -------------------- */

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", debouncedSearch],
    queryFn: async (): Promise<Employee[]> => {
      let query = supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (debouncedSearch) {
        query = query.or(
          `full_name.ilike.%${debouncedSearch}%,employee_id.ilike.%${debouncedSearch}%,department.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return data ?? [];
    },
    keepPreviousData: true,
  });

  /* -------------------- ADD EMPLOYEE -------------------- */

  const addMutation = useMutation({
    mutationFn: async (emp: Omit<Employee, "id" | "created_at">) => {
      const { error } = await supabase.from("employees").insert([emp]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      setForm({ employee_id: "", full_name: "", email: "", department: "" });
      setErrors({});
      toast.success("Employee added successfully");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate key")) {
        if (err.message.includes("employee_id")) toast.error("Employee ID already exists");
        else if (err.message.includes("email")) toast.error("Email already exists");
        else toast.error("Duplicate entry");
      } else {
        toast.error(err.message || "Failed to add employee");
      }
    },
  });

  /* -------------------- DELETE EMPLOYEE (Optimistic) -------------------- */

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["employees"] });

      const previous = queryClient.getQueryData<Employee[]>(["employees", debouncedSearch]);

      queryClient.setQueryData<Employee[]>(["employees", debouncedSearch], (old = []) =>
        old.filter((emp) => emp.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["employees", debouncedSearch], context.previous);
      }
      toast.error("Failed to delete employee");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  /* -------------------- SUBMIT -------------------- */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = employeeSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    addMutation.mutate(result.data);
  };

  /* -------------------- UI -------------------- */

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground mt-1">
            Manage your employee records
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Employee ID</Label>
                <Input
                  value={form.employee_id}
                  onChange={(e) =>
                    setForm({ ...form, employee_id: e.target.value })
                  }
                  placeholder="EMP-001"
                />
                {errors.employee_id && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.employee_id}
                  </p>
                )}
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.full_name}
                  </p>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="john@company.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <Label>Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) =>
                    setForm({ ...form, department: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.department}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Employee Directory</CardTitle>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search
                ? "No employees match your search"
                : "No employees yet. Add your first employee."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">
                      {emp.employee_id}
                    </TableCell>
                    <TableCell>{emp.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.email}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                        {emp.department}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(emp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
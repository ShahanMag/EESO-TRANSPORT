"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

interface Employee {
  _id: string;
  name: string;
  iqamaId: string;
  phone: string;
  type: "employee" | "agent";
}

interface Vehicle {
  _id: string;
  number: string;
  name: string;
  employeeId?: string | { _id: string; name: string; type: string } | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    iqamaId: "",
    phone: "+966",
    type: "employee" as "employee" | "agent",
  });
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEmployees();
    fetchVehicles();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.iqamaId.includes(searchTerm) ||
        emp.phone.includes(searchTerm)
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async function fetchVehicles() {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!/^\d{10}$/.test(formData.iqamaId)) {
      newErrors.iqamaId = "Iqama ID must be exactly 10 digits";
    }

    if (!/^\+966\d{9}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be in format +966XXXXXXXXX";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editingEmployee
        ? `/api/employees/${editingEmployee._id}`
        : "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        const employeeId = data.data._id;

        // Update vehicle assignments
        // First, unassign all vehicles that were previously assigned to this employee
        if (editingEmployee) {
          const previousVehicles = vehicles.filter(
            (v) => v.employeeId === editingEmployee._id
          );
          const vehiclesToUnassign = previousVehicles.filter(
            (v) => !selectedVehicles.includes(v._id)
          );

          for (const vehicle of vehiclesToUnassign) {
            await fetch(`/api/vehicles/${vehicle._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...vehicle,
                employeeId: null,
              }),
            });
          }
        }

        // Assign selected vehicles to this employee
        for (const vehicleId of selectedVehicles) {
          const vehicle = vehicles.find((v) => v._id === vehicleId);
          if (vehicle) {
            await fetch(`/api/vehicles/${vehicleId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...vehicle,
                employeeId: employeeId,
              }),
            });
          }
        }

        fetchEmployees();
        fetchVehicles();
        handleCloseDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      setErrors({ submit: "An error occurred" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        fetchEmployees();
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  }

  function handleOpenDialog(employee?: Employee) {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        iqamaId: employee.iqamaId,
        phone: employee.phone,
        type: employee.type,
      });
      // Load vehicles assigned to this employee
      const assignedVehicles = vehicles
        .filter((v) => {
          // Handle both populated and non-populated employeeId
          const empId = typeof v.employeeId === 'object' && v.employeeId !== null
            ? (v.employeeId as any)._id
            : v.employeeId;
          return empId === employee._id;
        })
        .map((v) => v._id);
      setSelectedVehicles(assignedVehicles);
    } else {
      setEditingEmployee(null);
      setFormData({ name: "", iqamaId: "", phone: "+966", type: "employee" });
      setSelectedVehicles([]);
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ name: "", iqamaId: "", phone: "+966", type: "employee" });
    setSelectedVehicles([]);
    setErrors({});
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employees</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, Iqama ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Iqama ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr key={employee._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {employee.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.iqamaId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant={employee.type === "agent" ? "default" : "secondary"}>
                    {employee.type === "agent" ? "Agent" : "Employee"}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(employee)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(employee._id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No employees found
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="iqamaId">Iqama ID (10 digits)</Label>
                <Input
                  id="iqamaId"
                  value={formData.iqamaId}
                  onChange={(e) =>
                    setFormData({ ...formData, iqamaId: e.target.value })
                  }
                  maxLength={10}
                />
                {errors.iqamaId && (
                  <p className="text-sm text-red-500 mt-1">{errors.iqamaId}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone (+966XXXXXXXXX)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as "employee" | "agent" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign Vehicles (Optional)</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {vehicles.length === 0 ? (
                    <p className="text-sm text-gray-500">No vehicles available</p>
                  ) : (
                    vehicles.map((vehicle) => (
                      <div key={vehicle._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`vehicle-${vehicle._id}`}
                          checked={selectedVehicles.includes(vehicle._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVehicles([...selectedVehicles, vehicle._id]);
                            } else {
                              setSelectedVehicles(
                                selectedVehicles.filter((id) => id !== vehicle._id)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label
                          htmlFor={`vehicle-${vehicle._id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {vehicle.number} - {vehicle.name}
                          {(() => {
                            // Handle both populated and non-populated employeeId
                            const empId = typeof vehicle.employeeId === 'object' && vehicle.employeeId !== null
                              ? (vehicle.employeeId as any)._id
                              : vehicle.employeeId;

                            // Show "Already assigned" only if vehicle is assigned to a different employee
                            return empId && empId !== editingEmployee?._id && (
                              <span className="text-xs text-red-500 ml-2">
                                (Already assigned)
                              </span>
                            );
                          })()}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {selectedVehicles.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedVehicles.length} vehicle(s) selected
                  </p>
                )}
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingEmployee ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

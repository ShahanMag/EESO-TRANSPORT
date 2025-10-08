"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface Vehicle {
  _id: string;
  number: string;
  name: string;
  employeeId: { _id: string; name: string; type: string } | null;
}

interface Employee {
  _id: string;
  name: string;
  type: string;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    name: "",
    serialNumber: "",
    type: "private" as "private" | "public",
    model: "",
    vehicleAmount: "",
    startDate: "",
    contractExpiry: "",
    description: "",
    employeeId: "unassigned",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVehicles();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = vehicles.filter(
      (v) =>
        v.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVehicles(filtered);
  }, [searchTerm, vehicles]);

  async function fetchVehicles() {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      } else {
        toast.error("Failed to fetch vehicles");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Error fetching vehicles");
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      } else {
        toast.error("Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Error fetching employees");
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vehicle name is required";
    }

    if (!formData.number.trim()) {
      newErrors.number = "Vehicle number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editingVehicle
        ? `/api/vehicles/${editingVehicle._id}`
        : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: formData.number,
          name: formData.name,
          serialNumber: formData.serialNumber || undefined,
          type: formData.type,
          model: formData.model || undefined,
          vehicleAmount: formData.vehicleAmount
            ? parseFloat(formData.vehicleAmount)
            : undefined,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          contractExpiry: formData.contractExpiry
            ? new Date(formData.contractExpiry)
            : undefined,
          description: formData.description || undefined,
          employeeId: formData.employeeId === "unassigned" ? null : formData.employeeId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingVehicle
            ? "Vehicle updated successfully"
            : "Vehicle created successfully"
        );
        fetchVehicles();
        handleCloseDialog();
      } else {
        toast.error(data.error || "Failed to save vehicle");
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error("An error occurred while saving vehicle");
      setErrors({ submit: "An error occurred" });
    }
  }

  function handleDeleteClick(id: string) {
    setDeletingVehicleId(id);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingVehicleId) return;

    try {
      const res = await fetch(`/api/vehicles/${deletingVehicleId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Vehicle deleted successfully");
        fetchVehicles();
      } else {
        toast.error(data.error || "Failed to delete vehicle");
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("An error occurred while deleting vehicle");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingVehicleId(null);
    }
  }

  function handleOpenDialog(vehicle?: Vehicle) {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        number: vehicle.number,
        name: vehicle.name,
        serialNumber: (vehicle as any).serialNumber || "",
        type: (vehicle as any).type || "private",
        model: (vehicle as any).model || "",
        vehicleAmount: (vehicle as any).vehicleAmount?.toString() || "",
        startDate: (vehicle as any).startDate
          ? new Date((vehicle as any).startDate).toISOString().split("T")[0]
          : "",
        contractExpiry: (vehicle as any).contractExpiry
          ? new Date((vehicle as any).contractExpiry).toISOString().split("T")[0]
          : "",
        description: (vehicle as any).description || "",
        employeeId: vehicle.employeeId?._id || "unassigned",
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        number: "",
        name: "",
        serialNumber: "",
        type: "private",
        model: "",
        vehicleAmount: "",
        startDate: "",
        contractExpiry: "",
        description: "",
        employeeId: "unassigned",
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingVehicle(null);
    setFormData({
      number: "",
      name: "",
      serialNumber: "",
      type: "private",
      model: "",
      vehicleAmount: "",
      startDate: "",
      contractExpiry: "",
      description: "",
      employeeId: "unassigned",
    });
    setErrors({});
  }

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vehicles</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Vehicles</p>
          <p className="text-2xl font-bold text-purple-600">{vehicles.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Assigned</p>
          <p className="text-2xl font-bold text-green-600">
            {vehicles.filter((v) => v.employeeId).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unassigned</p>
          <p className="text-2xl font-bold text-orange-600">
            {vehicles.filter((v) => !v.employeeId).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Search Results</p>
          <p className="text-2xl font-bold text-blue-600">{filteredVehicles.length}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by vehicle number or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Employee
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVehicles.map((vehicle) => (
              <tr
                key={vehicle._id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/vehicles/${vehicle._id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {vehicle.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.employeeId
                    ? vehicle.employeeId.name
                    : "Unassigned"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(vehicle);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(vehicle._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVehicles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No vehicles found
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredVehicles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No vehicles found
          </div>
        ) : (
          filteredVehicles.map((vehicle) => (
            <div
              key={vehicle._id}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/vehicles/${vehicle._id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{vehicle.number}</h3>
                  <p className="text-sm text-gray-600">{vehicle.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {vehicle.employeeId ? vehicle.employeeId.name : "Unassigned"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(vehicle);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(vehicle._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">
                  Vehicle Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  placeholder="e.g., ABC-1234"
                />
                {errors.number && (
                  <p className="text-sm text-red-500 mt-1">{errors.number}</p>
                )}
              </div>
              <div>
                <Label htmlFor="name">
                  Vehicle Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Toyota Camry"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  placeholder="e.g., SN123456"
                />
              </div>
              <div>
                <Label htmlFor="type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "private" | "public") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g., 2024"
                />
              </div>
              <div>
                <Label htmlFor="vehicleAmount">Vehicle Amount (SAR)</Label>
                <Input
                  id="vehicleAmount"
                  type="number"
                  step="0.01"
                  value={formData.vehicleAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleAmount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="contractExpiry">Contract Expiry</Label>
                <Input
                  id="contractExpiry"
                  type="date"
                  value={formData.contractExpiry}
                  onChange={(e) =>
                    setFormData({ ...formData, contractExpiry: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="employeeId">Assigned Employee</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Additional notes or remarks"
                />
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500 md:col-span-2">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVehicle ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Vehicle"
        description="Are you sure you want to delete this vehicle? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

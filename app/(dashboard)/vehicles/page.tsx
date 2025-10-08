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
import { Plus, Search, Edit, Trash2, Upload, Download } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { exportToExcel } from "@/lib/excel-utils";

interface Vehicle {
  _id: string;
  number: string;
  name: string;
  serialNumber?: string;
  type: "private" | "public";
  model?: string;
  vehicleAmount?: number;
  startDate?: string;
  contractExpiry?: string;
  description?: string;
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
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  async function handleOpenDialog(vehicle?: Vehicle) {
    if (vehicle) {
      // Fetch complete vehicle data from API
      try {
        const res = await fetch(`/api/vehicles/${vehicle._id}`);
        const data = await res.json();

        if (data.success) {
          const fullVehicle = data.data;
          setEditingVehicle(fullVehicle);
          setFormData({
            number: fullVehicle.number,
            name: fullVehicle.name,
            serialNumber: fullVehicle.serialNumber || "",
            type: fullVehicle.type || "private",
            model: fullVehicle.model || "",
            vehicleAmount: fullVehicle.vehicleAmount?.toString() || "",
            startDate: fullVehicle.startDate
              ? new Date(fullVehicle.startDate).toISOString().split("T")[0]
              : "",
            contractExpiry: fullVehicle.contractExpiry
              ? new Date(fullVehicle.contractExpiry).toISOString().split("T")[0]
              : "",
            description: fullVehicle.description || "",
            employeeId: fullVehicle.employeeId?._id || fullVehicle.employeeId || "unassigned",
          });
        } else {
          toast.error("Failed to fetch vehicle details");
          return;
        }
      } catch (error) {
        console.error("Error fetching vehicle:", error);
        toast.error("Error loading vehicle data");
        return;
      }
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

  function downloadTemplate() {
    const templateData = [
      {
        number: "ABC-1234",
        name: "Toyota Camry",
        serialNumber: "SN123456",
        type: "private",
        model: "2023",
        vehicleAmount: 150000,
        startDate: "2024-01-15",
        contractExpiry: "2025-01-15",
        description: "Company vehicle for senior management",
        employeeId: "",
      },
      {
        number: "XYZ-5678",
        name: "Honda Accord",
        serialNumber: "SN789012",
        type: "public",
        model: "2022",
        vehicleAmount: 120000,
        startDate: "2024-02-01",
        contractExpiry: "2025-02-01",
        description: "Vehicle for field operations",
        employeeId: "",
      },
    ];

    const columns = [
      { header: "Vehicle Number", key: "number", width: 18 },
      { header: "Vehicle Name", key: "name", width: 25 },
      { header: "Serial Number", key: "serialNumber", width: 18 },
      { header: "Type (private/public)", key: "type", width: 20 },
      { header: "Model", key: "model", width: 15 },
      { header: "Vehicle Amount (SAR)", key: "vehicleAmount", width: 20 },
      { header: "Start Date (YYYY-MM-DD)", key: "startDate", width: 20 },
      { header: "Contract Expiry (YYYY-MM-DD)", key: "contractExpiry", width: 25 },
      { header: "Description", key: "description", width: 35 },
      { header: "Employee Iqama ID (Optional)", key: "employeeId", width: 25 },
    ];

    exportToExcel(templateData, columns, "vehicle-template");
    toast.success("Template downloaded successfully");
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of jsonData as any[]) {
        try {
          // Validate required fields
          if (!row["Vehicle Number"] || !row["Vehicle Name"]) {
            errors.push(`Row with number "${row["Vehicle Number"] || "unknown"}" is missing required fields`);
            errorCount++;
            continue;
          }

          const type = (row["Type (private/public)"] || "private").toLowerCase();
          const vehicleAmount = row["Vehicle Amount (SAR)"];
          const startDate = row["Start Date (YYYY-MM-DD)"];
          const contractExpiry = row["Contract Expiry (YYYY-MM-DD)"];
          const employeeIqamaId = row["Employee Iqama ID (Optional)"];

          // Validate type
          if (type !== "private" && type !== "public") {
            errors.push(`Row "${row["Vehicle Number"]}": Type must be "private" or "public"`);
            errorCount++;
            continue;
          }

          // Find employee by Iqama ID if provided
          let employeeId = null;
          if (employeeIqamaId) {
            const employee = employees.find((e) => e._id === employeeIqamaId || (e as any).iqamaId === employeeIqamaId);
            if (employee) {
              employeeId = employee._id;
            } else {
              errors.push(`Row "${row["Vehicle Number"]}": Employee with Iqama ID "${employeeIqamaId}" not found`);
            }
          }

          const res = await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              number: row["Vehicle Number"],
              name: row["Vehicle Name"],
              serialNumber: row["Serial Number"] || undefined,
              type: type,
              model: row["Model"] || undefined,
              vehicleAmount: vehicleAmount ? parseFloat(vehicleAmount.toString()) : undefined,
              startDate: startDate ? new Date(startDate) : undefined,
              contractExpiry: contractExpiry ? new Date(contractExpiry) : undefined,
              description: row["Description"] || undefined,
              employeeId: employeeId,
            }),
          });

          const result = await res.json();

          if (result.success) {
            successCount++;
          } else {
            errors.push(`Row "${row["Vehicle Number"]}": ${result.error}`);
            errorCount++;
          }
        } catch (error) {
          errors.push(`Row "${row["Vehicle Number"]}": ${error}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} vehicle(s)`);
        fetchVehicles();
      }

      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} vehicle(s). Check console for details.`);
        console.error("Bulk upload errors:", errors);
      }

      setIsBulkUploadDialogOpen(false);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing file. Please check the format.");
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vehicles</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
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

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Vehicles</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Download the Excel template below</li>
                <li>Fill in vehicle details following the format in the template</li>
                <li>Make sure all required fields are filled correctly</li>
                <li>Upload the completed Excel file</li>
              </ol>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="bulk-upload-input"
                  />
                  <Button
                    type="button"
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Excel File"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Template Format:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Vehicle Number:</strong> Required - Unique identifier (e.g., ABC-1234)</p>
                <p><strong>Vehicle Name:</strong> Required - Vehicle model/name (e.g., Toyota Camry)</p>
                <p><strong>Serial Number:</strong> Optional - Vehicle serial number</p>
                <p><strong>Type:</strong> Either "private" or "public" (default: private)</p>
                <p><strong>Model:</strong> Optional - Year or model info (e.g., 2023)</p>
                <p><strong>Vehicle Amount:</strong> Optional - Price in SAR (e.g., 150000)</p>
                <p><strong>Start Date:</strong> Optional - Format YYYY-MM-DD (e.g., 2024-01-15)</p>
                <p><strong>Contract Expiry:</strong> Optional - Format YYYY-MM-DD (e.g., 2025-01-15)</p>
                <p><strong>Description:</strong> Optional - Additional notes</p>
                <p><strong>Employee Iqama ID:</strong> Optional - Assign to employee by Iqama ID</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkUploadDialogOpen(false)}
              disabled={isUploading}
            >
              Close
            </Button>
          </DialogFooter>
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

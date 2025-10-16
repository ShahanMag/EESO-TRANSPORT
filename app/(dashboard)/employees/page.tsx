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
import { Plus, Search, Edit, Trash2, X, Upload, Download, UserX, ImagePlus } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import Image from "next/image";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { exportToExcel } from "@/lib/excel-utils";
import { apiRequest } from "@/lib/api-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Employee {
  _id: string;
  name: string;
  iqamaId: string;
  phone?: string;
  type: "employee" | "agent";
  joinDate?: string;
  imageUrls?: string[];
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
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    iqamaId: "",
    phone: "+966",
    type: "employee" as "employee" | "agent",
    joinDate: "",
  });
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [terminatingEmployee, setTerminatingEmployee] = useState<Employee | null>(null);
  const [terminateFormData, setTerminateFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // Initial load - fetch immediately
  useEffect(() => {
    fetchEmployees();
    fetchVehicles();
  }, []);

  // Debounced search effect - only for search
  useEffect(() => {
    if (searchTerm === "") return; // Skip on empty search (handled by initial load)

    const delayDebounceFn = setTimeout(() => {
      fetchEmployees(searchTerm, 1); // Reset to page 1 on search
    }, 500); // 500ms delay after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  function handlePageChange(page: number) {
    fetchEmployees(searchTerm, page, pagination.itemsPerPage);
  }

  function handleItemsPerPageChange(limit: number) {
    fetchEmployees(searchTerm, 1, limit); // Reset to page 1 when changing items per page
  }

  async function fetchEmployees(search = "", page = pagination.currentPage, limit = pagination.itemsPerPage) {
    try {
      if (search) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append("search", search);
      }

      const url = `/api/employees?${params.toString()}`;

      const res = await apiRequest(url);
      const data = await res.json();

      if (data.success) {
        setEmployees(data.data);
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.page,
            totalPages: data.pagination.totalPages,
            totalItems: data.pagination.total,
            itemsPerPage: data.pagination.limit,
          });
        }
      } else {
        toast.error("Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Error fetching employees");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  async function fetchVehicles() {
    try {
      const res = await apiRequest("/api/vehicles");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newImageUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await apiRequest("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          newImageUrls.push(data.url);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      setImageUrls([...imageUrls, ...newImageUrls]);
      toast.success(`${newImageUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Error uploading images");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  function handleRemoveImage(index: number) {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!/^\d{10}$/.test(formData.iqamaId)) {
      newErrors.iqamaId = "Iqama ID must be exactly 10 digits";
    }

    // Phone is optional, but if provided, must match format
    if (formData.phone && formData.phone.trim() !== "+966" && !/^\+966\d{9}$/.test(formData.phone)) {
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

      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          iqamaId: formData.iqamaId,
          phone: formData.phone,
          type: formData.type,
          joinDate: formData.joinDate ? new Date(formData.joinDate) : undefined,
          imageUrls: imageUrls,
        }),
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
            await fetch(`${API_URL}/api/vehicles/${vehicle._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                number: vehicle.number,
                name: vehicle.name,
                employeeId: null,
              }),
            });
          }
        }

        // Assign selected vehicles to this employee
        for (const vehicleId of selectedVehicles) {
          const vehicle = vehicles.find((v) => v._id === vehicleId);
          if (vehicle) {
            // Extract only the necessary fields to avoid passing populated objects
            const empIdValue = typeof vehicle.employeeId === 'object' && vehicle.employeeId !== null
              ? (vehicle.employeeId as any)._id
              : vehicle.employeeId;

            await fetch(`${API_URL}/api/vehicles/${vehicleId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                number: vehicle.number,
                name: vehicle.name,
                employeeId: employeeId,
              }),
            });
          }
        }

        toast.success(
          editingEmployee
            ? "Employee updated successfully"
            : "Employee created successfully"
        );
        fetchEmployees(searchTerm);
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

  function handleTerminateClick(employee: Employee) {
    setTerminatingEmployee(employee);
    setTerminateFormData({
      date: new Date().toISOString().split("T")[0],
      reason: "",
    });
    setIsTerminateDialogOpen(true);
  }

  async function handleTerminateConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!terminatingEmployee) return;

    try {
      // Get vehicles assigned to this employee
      const assignedVehicles = vehicles.filter((v) => {
        const empId = typeof v.employeeId === 'object' && v.employeeId !== null
          ? (v.employeeId as any)._id
          : v.employeeId;
        return empId === terminatingEmployee._id;
      });

      // Unassign all vehicles
      for (const vehicle of assignedVehicles) {
        await fetch(`${API_URL}/api/vehicles/${vehicle._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            number: vehicle.number,
            name: vehicle.name,
            employeeId: null,
          }),
        });
      }

      // Delete the employee
      const res = await fetch(`${API_URL}/api/employees/${terminatingEmployee._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Employee terminated successfully. ${assignedVehicles.length} vehicle(s) unassigned.`);
        fetchEmployees(searchTerm);
        fetchVehicles();
        setIsTerminateDialogOpen(false);
        setTerminatingEmployee(null);
      } else {
        toast.error(data.error || "Failed to terminate employee");
      }
    } catch (error) {
      console.error("Error terminating employee:", error);
      toast.error("An error occurred while terminating employee");
    }
  }

  async function handleOpenDialog(employee?: Employee) {
    if (employee) {
      // Fetch complete employee data from API
      try {
        const res = await fetch(`${API_URL}/api/employees/${employee._id}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success) {
          const fullEmployee = data.data;
          setEditingEmployee(fullEmployee);
          setFormData({
            name: fullEmployee.name,
            iqamaId: fullEmployee.iqamaId,
            phone: fullEmployee.phone || "+966",
            type: fullEmployee.type,
            joinDate: fullEmployee.joinDate
              ? new Date(fullEmployee.joinDate).toISOString().split("T")[0]
              : "",
          });
          setImageUrls(fullEmployee.imageUrls || []);
          // Load vehicles assigned to this employee
          const assignedVehicles = vehicles
            .filter((v) => {
              // Handle both populated and non-populated employeeId
              const empId = typeof v.employeeId === 'object' && v.employeeId !== null
                ? (v.employeeId as any)._id
                : v.employeeId;
              return empId === fullEmployee._id;
            })
            .map((v) => v._id);
          setSelectedVehicles(assignedVehicles);
        } else {
          toast.error("Failed to fetch employee details");
          return;
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        toast.error("Error loading employee data");
        return;
      }
    } else {
      setEditingEmployee(null);
      setFormData({ name: "", iqamaId: "", phone: "+966", type: "employee", joinDate: "" });
      setSelectedVehicles([]);
      setImageUrls([]);
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ name: "", iqamaId: "", phone: "+966", type: "employee", joinDate: "" });
    setSelectedVehicles([]);
    setImageUrls([]);
    setErrors({});
  }

  function downloadTemplate() {
    const templateData = [
      {
        name: "John Doe",
        iqamaId: "1234567890",
        phone: "966501234567",
        type: "employee",
        joinDate: "2024-01-15",
        vehicleNumber: "ABC-1234",
      },
      {
        name: "Jane Smith",
        iqamaId: "9876543210",
        phone: "966509876543",
        type: "agent",
        joinDate: "2024-02-20",
        vehicleNumber: "",
      },
    ];

    const columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Iqama ID (10 digits)", key: "iqamaId", width: 20 },
      { header: "Phone (966XXXXXXXXX) - Optional", key: "phone", width: 25 },
      { header: "Type (employee/agent)", key: "type", width: 20 },
      { header: "Join Date (YYYY-MM-DD)", key: "joinDate", width: 20 },
      { header: "Vehicle Number - Optional", key: "vehicleNumber", width: 20 },
    ];

    exportToExcel(templateData, columns, "employee-template");
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

      const employees: any[] = [];
      const errors: string[] = [];

      // Validate and prepare all employees first
      for (const row of jsonData as any[]) {
        try {
          // Validate required fields (phone is now optional)
          if (!row.Name || !row["Iqama ID (10 digits)"]) {
            errors.push(`Row with name "${row.Name || "unknown"}" is missing required fields`);
            continue;
          }

          const iqamaId = row["Iqama ID (10 digits)"].toString();
          let phone = row["Phone (966XXXXXXXXX)"] ? row["Phone (966XXXXXXXXX)"].toString().trim() : "";
          const type = (row["Type (employee/agent)"] || "employee").toLowerCase();

          // Handle date conversion - Excel can return dates in various formats
          let joinDate = null;
          if (row["Join Date (YYYY-MM-DD)"]) {
            const rawDate = row["Join Date (YYYY-MM-DD)"];

            // If it's already a Date object (Excel sometimes does this)
            if (rawDate instanceof Date) {
              joinDate = rawDate.toISOString().split('T')[0];
            }
            // If it's an Excel serial number (number of days since 1900-01-01)
            else if (typeof rawDate === 'number') {
              const excelEpoch = new Date(1900, 0, 1);
              const date = new Date(excelEpoch.getTime() + (rawDate - 2) * 24 * 60 * 60 * 1000);
              joinDate = date.toISOString().split('T')[0];
            }
            // If it's a string, try to parse it
            else if (typeof rawDate === 'string') {
              const parsedDate = new Date(rawDate);
              if (!isNaN(parsedDate.getTime())) {
                joinDate = parsedDate.toISOString().split('T')[0];
              }
            }
          }

          // Validate iqama ID
          if (!/^\d{10}$/.test(iqamaId)) {
            errors.push(`Row "${row.Name}": Iqama ID must be exactly 10 digits`);
            continue;
          }

          // Phone is optional, but if provided, validate and format
          if (phone) {
            // Remove any spaces or dashes
            phone = phone.replace(/[\s-]/g, '');

            // If phone starts with 966 but not +966, add the +
            if (/^966\d{9}$/.test(phone)) {
              phone = '+' + phone;
            }

            // Now validate the final format
            if (!/^\+966\d{9}$/.test(phone)) {
              errors.push(`Row "${row.Name}": Phone must be in format 966XXXXXXXXX or +966XXXXXXXXX`);
              continue;
            }
          }

          // Validate type
          if (type !== "employee" && type !== "agent") {
            errors.push(`Row "${row.Name}": Type must be "employee" or "agent"`);
            continue;
          }

          // Add valid employee to array
          const employeeData: any = {
            name: row.Name,
            iqamaId: iqamaId,
            type: type,
          };

          // Only add optional fields if they have values
          if (phone) employeeData.phone = phone;
          if (joinDate) employeeData.joinDate = joinDate;

          employees.push(employeeData);
        } catch (error) {
          errors.push(`Row "${row.Name}": ${error}`);
        }
      }

      // If there are validation errors, show them
      if (errors.length > 0) {
        toast.error(`${errors.length} row(s) failed validation. Check console for details.`);
        console.error("Bulk upload validation errors:", errors);
      }

      // If there are no valid employees, exit
      if (employees.length === 0) {
        toast.error("No valid employees to upload");
        setIsBulkUploadDialogOpen(false);
        return;
      }

      // Send all employees in a single request
      const res = await fetch(`${API_URL}/api/employees/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employees }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Successfully uploaded ${result.successCount} employee(s)`);
        if (result.errors && result.errors.length > 0) {
          toast.warning(`${result.errors.length} employee(s) failed. Check console for details.`);
          console.error("Bulk upload errors:", result.errors);
        }
        fetchEmployees(searchTerm);
        setIsBulkUploadDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to upload employees");
        if (result.errors) {
          console.error("Bulk upload errors:", result.errors);
        }
      }
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
        <h1 className="text-3xl font-bold">Employees</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-blue-700">Total Employees</p>
          <p className="text-2xl font-bold text-blue-900">{pagination.totalItems}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-green-700">Current Page</p>
          <p className="text-2xl font-bold text-green-900">
            {employees.length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-purple-700">Page</p>
          <p className="text-2xl font-bold text-purple-900">
            {pagination.currentPage} / {pagination.totalPages}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-amber-700">
            {searchTerm ? "Search Results" : "Viewing"}
          </p>
          <p className="text-2xl font-bold text-amber-900">{employees.length}</p>
        </div>
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
          {searching && (
            <div className="absolute right-3 top-3">
              <LoadingSpinner />
            </div>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-xs text-gray-500">
            Searching for: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{searchTerm}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Vehicles
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => {
              // Get vehicles assigned to this employee
              const assignedVehicles = vehicles
                .filter((v) => {
                  const empId = typeof v.employeeId === 'object' && v.employeeId !== null
                    ? (v.employeeId as any)._id
                    : v.employeeId;
                  return empId === employee._id;
                })
                .map((v) => v.number)
                .join(", ");

              return (
                <tr key={employee._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {employee.imageUrls && employee.imageUrls.length > 0 ? (
                      <Image
                        src={employee.imageUrls[0]}
                        alt={employee.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-xs font-medium">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.iqamaId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.phone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Badge variant={employee.type === "agent" ? "default" : "secondary"}>
                      {employee.type === "agent" ? "Agent" : "Employee"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignedVehicles || (
                      <span className="text-gray-400 italic">No vehicles</span>
                    )}
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
                      onClick={() => handleTerminateClick(employee)}
                      title="Terminate Employee"
                    >
                      <UserX className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? "No employees found matching your search" : "No employees found"}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
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
                <Label htmlFor="phone">Phone (+966XXXXXXXXX) - Optional</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+966XXXXXXXXX"
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
                <Label htmlFor="joinDate">Join Date</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) =>
                    setFormData({ ...formData, joinDate: e.target.value })
                  }
                />
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
              <div>
                <Label>Employee Images (Optional)</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="image-upload-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage}
                      className="w-full"
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {uploadingImage ? "Uploading..." : "Upload Images"}
                    </Button>
                  </div>
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={url}
                            alt={`Employee image ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-24 object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {imageUrls.length > 0 && (
                    <p className="text-xs text-gray-600">
                      {imageUrls.length} image(s) uploaded
                    </p>
                  )}
                </div>
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

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Employees</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Download the Excel template below</li>
                <li>Fill in employee details following the format in the template</li>
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
                <p><strong>Name:</strong> Employee full name</p>
                <p><strong>Iqama ID:</strong> Exactly 10 digits (e.g., 1234567890)</p>
                <p><strong>Phone:</strong> Format 966XXXXXXXXX or +966XXXXXXXXX (e.g., 966501234567) - Optional</p>
                <p><strong>Type:</strong> Either "employee" or "agent"</p>
                <p><strong>Join Date:</strong> Format YYYY-MM-DD (e.g., 2024-01-15) - Optional</p>
                <p><strong>Vehicle Number:</strong> Vehicle number to assign (e.g., ABC-1234) - Optional</p>
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

      {/* Terminate Employee Dialog */}
      <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Terminate Employee</DialogTitle>
          </DialogHeader>
          {terminatingEmployee && (
            <form onSubmit={handleTerminateConfirm}>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> You are about to terminate{" "}
                    <strong>{terminatingEmployee.name}</strong>.
                  </p>
                  {vehicles.filter((v) => {
                    const empId = typeof v.employeeId === 'object' && v.employeeId !== null
                      ? (v.employeeId as any)._id
                      : v.employeeId;
                    return empId === terminatingEmployee._id;
                  }).length > 0 && (
                    <p className="text-sm text-yellow-800 mt-2">
                      <strong>{vehicles.filter((v) => {
                        const empId = typeof v.employeeId === 'object' && v.employeeId !== null
                          ? (v.employeeId as any)._id
                          : v.employeeId;
                        return empId === terminatingEmployee._id;
                      }).length}</strong> assigned vehicle(s) will be unassigned.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="terminationDate">
                    Termination Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="terminationDate"
                    type="date"
                    value={terminateFormData.date}
                    onChange={(e) =>
                      setTerminateFormData({ ...terminateFormData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="terminationReason">
                    Reason for Termination <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="terminationReason"
                    value={terminateFormData.reason}
                    onChange={(e) =>
                      setTerminateFormData({ ...terminateFormData, reason: e.target.value })
                    }
                    placeholder="Enter reason for termination"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTerminateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">
                  Terminate Employee
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

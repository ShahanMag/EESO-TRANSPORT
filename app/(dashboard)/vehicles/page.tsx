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
import { Plus, Search, Edit, Trash2, Upload, Download, XCircle, Ban } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { exportToExcel } from "@/lib/excel-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface Vehicle {
  _id: string;
  number: string;
  name: string;
  serialNumber?: string;
  type: "private" | "public";
  vehicleModel?: string;
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(
    null
  );
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    number: "",
    name: "",
    serialNumber: "",
    type: "private" as "private" | "public",
    vehicleModel: "",
    vehicleAmount: "",
    startDate: "",
    contractExpiry: "",
    description: "",
    employeeId: "unassigned",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedVehicles, setParsedVehicles] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showTerminated, setShowTerminated] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [terminatingVehicle, setTerminatingVehicle] = useState<Vehicle | null>(null);
  const [terminateFormData, setTerminateFormData] = useState({
    terminationDate: new Date().toISOString().split("T")[0],
    terminationReason: "",
  });

  // Initial load - fetch immediately
  useEffect(() => {
    fetchVehicles();
    fetchEmployees();
  }, []);

  // Debounced search effect - only for search
  useEffect(() => {
    if (searchTerm === "") return; // Skip on empty search (handled by initial load)

    const delayDebounceFn = setTimeout(() => {
      fetchVehicles(searchTerm, 1); // Reset to page 1 on search
    }, 500); // 500ms delay after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Refetch when terminated filter changes
  useEffect(() => {
    fetchVehicles(searchTerm, 1, pagination.itemsPerPage, showTerminated);
  }, [showTerminated]);

  function handlePageChange(page: number) {
    fetchVehicles(searchTerm, page, pagination.itemsPerPage, showTerminated);
  }

  function handleItemsPerPageChange(limit: number) {
    fetchVehicles(searchTerm, 1, limit, showTerminated); // Reset to page 1 when changing items per page
  }

  async function fetchVehicles(
    search = "",
    page = pagination.currentPage,
    limit = pagination.itemsPerPage,
    terminated = showTerminated
  ) {
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

      // Only add terminated parameter when explicitly showing terminated vehicles
      if (terminated) {
        params.append("terminated", "true");
      }

      const url = `/api/vehicles?${params.toString()}`;

      const res = await fetch(`${API_URL}${url}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setVehicles(data.data);
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.page,
            totalPages: data.pagination.totalPages,
            totalItems: data.pagination.total,
            itemsPerPage: data.pagination.limit,
          });
        }
      } else {
        toast.error("Failed to fetch vehicles");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Error fetching vehicles");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API_URL}/api/employees`, {
        credentials: "include",
      });
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

      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          number: formData.number,
          name: formData.name,
          serialNumber: formData.serialNumber || undefined,
          type: formData.type,
          vehicleModel: formData.vehicleModel || undefined,
          vehicleAmount: formData.vehicleAmount
            ? parseFloat(formData.vehicleAmount)
            : undefined,
          startDate:
            formData.startDate && formData.startDate.trim() !== ""
              ? new Date(formData.startDate)
              : undefined,
          contractExpiry:
            formData.contractExpiry && formData.contractExpiry.trim() !== ""
              ? new Date(formData.contractExpiry)
              : undefined,
          description: formData.description || undefined,
          employeeId:
            formData.employeeId === "unassigned" ? null : formData.employeeId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingVehicle
            ? "Vehicle updated successfully"
            : "Vehicle created successfully"
        );
        fetchVehicles(searchTerm);
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
      const res = await fetch(`${API_URL}/api/vehicles/${deletingVehicleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Vehicle deleted successfully");
        fetchVehicles(searchTerm);
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
        const res = await fetch(`${API_URL}/api/vehicles/${vehicle._id}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success) {
          const fullVehicle = data.data;
          setEditingVehicle(fullVehicle);
          setFormData({
            number: fullVehicle.number,
            name: fullVehicle.name,
            serialNumber: fullVehicle.serialNumber || "",
            type: fullVehicle.type || "private",
            vehicleModel: fullVehicle.vehicleModel || "",
            vehicleAmount: fullVehicle.vehicleAmount?.toString() || "",
            startDate: fullVehicle.startDate
              ? new Date(fullVehicle.startDate).toISOString().split("T")[0]
              : "",
            contractExpiry: fullVehicle.contractExpiry
              ? new Date(fullVehicle.contractExpiry).toISOString().split("T")[0]
              : "",
            description: fullVehicle.description || "",
            employeeId:
              fullVehicle.employeeId?._id ||
              fullVehicle.employeeId ||
              "unassigned",
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
        vehicleModel: "",
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
      vehicleModel: "",
      vehicleAmount: "",
      startDate: "",
      contractExpiry: "",
      description: "",
      employeeId: "unassigned",
    });
    setErrors({});
  }

  function handleTerminateClick(vehicle: Vehicle) {
    setTerminatingVehicle(vehicle);
    setTerminateFormData({
      terminationDate: new Date().toISOString().split("T")[0],
      terminationReason: "",
    });
    setIsTerminateDialogOpen(true);
  }

  async function handleTerminateConfirm() {
    if (!terminatingVehicle) return;

    if (!terminateFormData.terminationDate || !terminateFormData.terminationReason) {
      toast.error("Please provide both termination date and reason");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/vehicles/${terminatingVehicle._id}/terminate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(terminateFormData),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success("Vehicle terminated successfully");
        fetchVehicles(searchTerm);
        setIsTerminateDialogOpen(false);
        setTerminatingVehicle(null);
        setTerminateFormData({
          terminationDate: new Date().toISOString().split("T")[0],
          terminationReason: "",
        });
      } else {
        toast.error(data.error || "Failed to terminate vehicle");
      }
    } catch (error) {
      console.error("Error terminating vehicle:", error);
      toast.error("An error occurred while terminating vehicle");
    }
  }

  function downloadTemplate() {
    const templateData = [
      {
        number: "ABC-1234",
        name: "Toyota Camry",
        serialNumber: "SN123456",
        type: "private",
        vehicleModel: "2023",
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
        vehicleModel: "2022",
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
      { header: "Model", key: "vehicleModel", width: 15 },
      { header: "Vehicle Amount (SAR)", key: "vehicleAmount", width: 20 },
      { header: "Start Date (YYYY-MM-DD)", key: "startDate", width: 20 },
      {
        header: "Contract Expiry (YYYY-MM-DD)",
        key: "contractExpiry",
        width: 25,
      },
      { header: "Description", key: "description", width: 35 },
      { header: "Employee Iqama ID (Optional)", key: "employeeId", width: 25 },
    ];

    exportToExcel(templateData, columns, "vehicle-template");
    toast.success("Template downloaded successfully");
  }

  // Helper function to parse various date formats
  function parseExcelDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }

    // If it's a string
    if (typeof dateValue === "string") {
      const trimmed = dateValue.trim();
      if (trimmed === "") return null;

      // Try to parse MM/DD/YYYY or M/D/YYYY format (Excel default)
      const slashFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const slashMatch = trimmed.match(slashFormat);
      if (slashMatch) {
        const [, month, day, year] = slashMatch;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        return isNaN(date.getTime()) ? null : date;
      }

      // Try to parse YYYY-MM-DD format (ISO)
      const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/;
      const isoMatch = trimmed.match(isoFormat);
      if (isoMatch) {
        const date = new Date(trimmed);
        return isNaN(date.getTime()) ? null : date;
      }

      // Try general date parsing as fallback
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? null : date;
    }

    // If it's a number (Excel serial date)
    if (typeof dateValue === "number") {
      // Excel dates are stored as days since 1900-01-01
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 86400000);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const vehicles: any[] = [];
      const errors: string[] = [];

      // Validate and prepare all vehicles first
      for (const row of jsonData as any[]) {
        try {
          // Validate required fields
          if (!row["Vehicle Number"] || !row["Vehicle Name"]) {
            errors.push(
              `Row with vehicle "${
                row["Vehicle Number"] || "unknown"
              }" is missing required fields (Vehicle Number and Vehicle Name)`
            );
            continue;
          }

          const type = (
            row["Type (private/public)"] || "private"
          ).toLowerCase();
          const vehicleAmount = row["Vehicle Amount (SAR)"];

          // Handle date conversion - Excel can return dates in various formats
          let startDate = null;
          if (row["Start Date (YYYY-MM-DD)"]) {
            const rawDate = row["Start Date (YYYY-MM-DD)"];

            // If it's already a Date object (Excel sometimes does this)
            if (rawDate instanceof Date) {
              const year = rawDate.getUTCFullYear();
              const month = String(rawDate.getUTCMonth() + 1).padStart(2, "0");
              const day = String(rawDate.getUTCDate()).padStart(2, "0");
              startDate = `${year}-${month}-${day}`;
            }
            // If it's an Excel serial number (number of days since 1900-01-01)
            else if (typeof rawDate === "number") {
              const excelEpoch = new Date(Date.UTC(1900, 0, 1));
              const date = new Date(
                excelEpoch.getTime() + (rawDate - 2) * 24 * 60 * 60 * 1000
              );
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, "0");
              const day = String(date.getUTCDate()).padStart(2, "0");
              startDate = `${year}-${month}-${day}`;
            }
            // If it's a string, try to parse it
            else if (typeof rawDate === "string") {
              const parsedDate = new Date(rawDate);
              if (!isNaN(parsedDate.getTime())) {
                const year = parsedDate.getUTCFullYear();
                const month = String(parsedDate.getUTCMonth() + 1).padStart(
                  2,
                  "0"
                );
                const day = String(parsedDate.getUTCDate()).padStart(2, "0");
                startDate = `${year}-${month}-${day}`;
              }
            }
          }

          let contractExpiry = null;
          if (row["Contract Expiry (YYYY-MM-DD)"]) {
            const rawDate = row["Contract Expiry (YYYY-MM-DD)"];

            // If it's already a Date object (Excel sometimes does this)
            if (rawDate instanceof Date) {
              const year = rawDate.getUTCFullYear();
              const month = String(rawDate.getUTCMonth() + 1).padStart(2, "0");
              const day = String(rawDate.getUTCDate()).padStart(2, "0");
              contractExpiry = `${year}-${month}-${day}`;
            }
            // If it's an Excel serial number (number of days since 1900-01-01)
            else if (typeof rawDate === "number") {
              const excelEpoch = new Date(Date.UTC(1900, 0, 1));
              const date = new Date(
                excelEpoch.getTime() + (rawDate - 2) * 24 * 60 * 60 * 1000
              );
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, "0");
              const day = String(date.getUTCDate()).padStart(2, "0");
              contractExpiry = `${year}-${month}-${day}`;
            }
            // If it's a string, try to parse it
            else if (typeof rawDate === "string") {
              const parsedDate = new Date(rawDate);
              if (!isNaN(parsedDate.getTime())) {
                const year = parsedDate.getUTCFullYear();
                const month = String(parsedDate.getUTCMonth() + 1).padStart(
                  2,
                  "0"
                );
                const day = String(parsedDate.getUTCDate()).padStart(2, "0");
                contractExpiry = `${year}-${month}-${day}`;
              }
            }
          }

          // Validate type
          if (type !== "private" && type !== "public") {
            errors.push(
              `Row "${row["Vehicle Number"]}": Type must be "private" or "public"`
            );
            continue;
          }

          const employeeIqamaId = row["Employee Iqama ID (Optional)"];

          // Build vehicle data object
          const vehicleData: any = {
            number: row["Vehicle Number"],
            name: row["Vehicle Name"],
            type: type,
          };

          // Add optional fields only if they have values
          if (row["Serial Number"])
            vehicleData.serialNumber = row["Serial Number"];
          if (row["Model"]) vehicleData.vehicleModel = row["Model"];
          if (vehicleAmount)
            vehicleData.vehicleAmount = parseFloat(vehicleAmount.toString());
          if (startDate) vehicleData.startDate = startDate;
          if (contractExpiry) vehicleData.contractExpiry = contractExpiry;
          if (row["Description"]) vehicleData.description = row["Description"];
          if (employeeIqamaId) vehicleData.iqamaId = employeeIqamaId;

          vehicles.push(vehicleData);
        } catch (error) {
          errors.push(`Row "${row["Vehicle Number"]}": ${error}`);
        }
      }

      // Store validation errors and parsed vehicles
      setValidationErrors(errors);
      setParsedVehicles(vehicles);

      // If there are validation errors, show them
      if (errors.length > 0) {
        toast.warning(
          `${errors.length} row(s) failed validation. Check the preview below.`
        );
      }

      // If there are no valid vehicles, show error
      if (vehicles.length === 0) {
        toast.error("No valid vehicles found in the file");
        setParsedVehicles([]);
        setValidationErrors(errors);
      } else {
        toast.success(`${vehicles.length} vehicle(s) ready to upload`);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing file. Please check the format.");
    } finally {
      // Reset file input
      e.target.value = "";
    }
  }

  async function handleBulkUploadSubmit() {
    if (parsedVehicles.length === 0) {
      toast.error("No vehicles to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress with random stops for animation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          // Random increment between 2-15%
          const randomIncrement = Math.floor(Math.random() * 13) + 2;
          return Math.min(prev + randomIncrement, 89);
        });
      }, 300);

      // Send all vehicles in a single request
      const res = await fetch(`${API_URL}/api/vehicles/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vehicles: parsedVehicles }),
      });

      const result = await res.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Delay for animation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (result.success) {
        toast.success(result.message || `Successfully uploaded vehicle(s)`);
        if (result.data?.errors && result.data.errors.length > 0) {
          toast.warning(
            `${result.data.errors.length} vehicle(s) failed. Check console for details.`
          );
          console.error("Bulk upload errors:", result.data.errors);
        }
        fetchVehicles(searchTerm);
        setIsBulkUploadDialogOpen(false);
        setParsedVehicles([]);
        setValidationErrors([]);
        setUploadProgress(0);
      } else {
        toast.error(result.error || "Failed to upload vehicles");
        if (result.data?.errors) {
          console.error("Bulk upload errors:", result.data.errors);
        }
      }
    } catch (error) {
      console.error("Error uploading vehicles:", error);
      toast.error("An error occurred while uploading vehicles");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadDialogOpen(true)}
          >
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
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-purple-700">Total Vehicles</p>
          <p className="text-2xl font-bold text-purple-900">
            {pagination.totalItems}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-green-700">Page</p>
          <p className="text-2xl font-bold text-green-900">
            {pagination.currentPage} / {pagination.totalPages}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-amber-700">
            {searchTerm ? "Search Results" : "Viewing"}
          </p>
          <p className="text-2xl font-bold text-amber-900">
            {vehicles.length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-blue-700">
            Assigned / Unassigned
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {vehicles.filter((v) => v.employeeId).length} / {vehicles.filter((v) => !v.employeeId).length}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by vehicle number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              dir="auto"
            />
            {searching && (
              <div className="absolute right-3 top-3">
                <LoadingSpinner />
              </div>
            )}
          </div>
          <Button
            variant={showTerminated ? "destructive" : "outline"}
            onClick={() => setShowTerminated(!showTerminated)}
            className="whitespace-nowrap"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {showTerminated ? "Showing Terminated" : "Show Terminated"}
          </Button>
        </div>
        {searchTerm && (
          <div className="mt-2 text-xs text-gray-500">
            Searching for:{" "}
            <span
              className="font-mono bg-gray-100 px-2 py-1 rounded"
              dir="auto"
            >
              {searchTerm}
            </span>
          </div>
        )}
        {showTerminated && (
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded border border-orange-200">
            Showing terminated vehicles only
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto h-[450px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SI NO
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Serial Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount (SAR)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiry Date
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
            {vehicles.map((vehicle, index) => (
              <tr
                key={vehicle._id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/vehicles/${vehicle._id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(pagination.currentPage - 1) * pagination.itemsPerPage + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {vehicle.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.serialNumber || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.type === "private"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {vehicle.type === "private" ? "Private" : "Public"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.vehicleAmount
                    ? new Intl.NumberFormat("en-SA", {
                        style: "currency",
                        currency: "SAR",
                        minimumFractionDigits: 0,
                      }).format(vehicle.vehicleAmount)
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.startDate &&
                  new Date(vehicle.startDate).getFullYear() !== 1970
                    ? new Date(vehicle.startDate).toLocaleDateString("en-GB")
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.contractExpiry &&
                  new Date(vehicle.contractExpiry).getFullYear() !== 1970
                    ? new Date(vehicle.contractExpiry).toLocaleDateString(
                        "en-GB"
                      )
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.employeeId ? vehicle.employeeId.name : "Unassigned"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(vehicle);
                    }}
                    title="Edit Vehicle"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTerminateClick(vehicle);
                    }}
                    title="Terminate Contract"
                  >
                    <Ban className="h-4 w-4 text-orange-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(vehicle._id);
                    }}
                    title="Delete Vehicle"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vehicles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm
              ? "No vehicles found matching your search"
              : "No vehicles found"}
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {searchTerm
              ? "No vehicles found matching your search"
              : "No vehicles found"}
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div
              key={vehicle._id}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/vehicles/${vehicle._id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {vehicle.number}
                  </h3>
                  <p className="text-sm text-gray-600">{vehicle.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.type === "private"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {vehicle.type === "private" ? "Private" : "Public"}
                    </span>
                  </div>
                  {vehicle.vehicleAmount && (
                    <p className="text-sm text-gray-700 font-medium mt-2">
                      {new Intl.NumberFormat("en-SA", {
                        style: "currency",
                        currency: "SAR",
                        minimumFractionDigits: 0,
                      }).format(vehicle.vehicleAmount)}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    {vehicle.startDate &&
                      new Date(vehicle.startDate).getFullYear() !== 1970 && (
                        <p>
                          Start:{" "}
                          {new Date(vehicle.startDate).toLocaleDateString(
                            "en-GB"
                          )}
                        </p>
                      )}
                    {vehicle.contractExpiry &&
                      new Date(vehicle.contractExpiry).getFullYear() !==
                        1970 && (
                        <p>
                          Expiry:{" "}
                          {new Date(vehicle.contractExpiry).toLocaleDateString(
                            "en-GB"
                          )}
                        </p>
                      )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {vehicle.employeeId
                      ? vehicle.employeeId.name
                      : "Unassigned"}
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

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

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
                  placeholder="e.g., ABC-1234 or أ ر د 1234"
                  dir="auto"
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
                <Label htmlFor="vehicleModel">Model</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleModel: e.target.value })
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
                <SearchableSelect
                  options={[
                    { value: "unassigned", label: "Unassigned" },
                    ...employees.map((emp) => ({
                      value: emp._id,
                      label: emp.name,
                      subtitle: emp.type === "agent" ? "Agent" : "Employee",
                    })),
                  ]}
                  value={formData.employeeId}
                  onChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                  placeholder="Select employee..."
                  searchPlaceholder="Search employees..."
                  emptyMessage="No employee found."
                />
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
                <p className="text-sm text-red-500 md:col-span-2">
                  {errors.submit}
                </p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
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
      <Dialog
        open={isBulkUploadDialogOpen}
        onOpenChange={setIsBulkUploadDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Upload Vehicles</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Instructions:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Download the Excel template below</li>
                <li>
                  Fill in vehicle details following the format in the template
                </li>
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
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="bulk-upload-input"
                  />
                  <Button
                    type="button"
                    disabled={isUploading}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Excel File
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            {parsedVehicles.length > 0 && (
              <div className="border border-gray-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Preview ({parsedVehicles.length} vehicle{parsedVehicles.length > 1 ? 's' : ''} ready)
                </h3>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded p-3">
                  <div className="space-y-2 text-sm">
                    {parsedVehicles.slice(0, 5).map((vehicle, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="font-medium">{vehicle.number}</span>
                        <span className="text-gray-600">{vehicle.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {vehicle.type}
                        </span>
                      </div>
                    ))}
                    {parsedVehicles.length > 5 && (
                      <p className="text-gray-500 text-center pt-2">
                        ...and {parsedVehicles.length - 5} more
                      </p>
                    )}
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <p className="font-semibold text-yellow-800 mb-1">
                      {validationErrors.length} row(s) had errors:
                    </p>
                    <div className="max-h-24 overflow-y-auto text-yellow-700">
                      {validationErrors.slice(0, 3).map((err, idx) => (
                        <p key={idx} className="text-xs">• {err}</p>
                      ))}
                      {validationErrors.length > 3 && (
                        <p className="text-xs italic">...and {validationErrors.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading vehicles...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Template Format:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Vehicle Number:</strong> Required - Unique identifier
                  (e.g., ABC-1234)
                </p>
                <p>
                  <strong>Vehicle Name:</strong> Required - Vehicle model/name
                  (e.g., Toyota Camry)
                </p>
                <p>
                  <strong>Serial Number:</strong> Optional - Vehicle serial
                  number
                </p>
                <p>
                  <strong>Type:</strong> Either "private" or "public" (default:
                  private)
                </p>
                <p>
                  <strong>Model:</strong> Optional - Year or model info (e.g.,
                  2023)
                </p>
                <p>
                  <strong>Vehicle Amount:</strong> Optional - Price in SAR
                  (e.g., 150000)
                </p>
                <p>
                  <strong>Start Date:</strong> Optional - YYYY-MM-DD or
                  MM/DD/YYYY (e.g., 2024-01-15 or 1/15/2024)
                </p>
                <p>
                  <strong>Contract Expiry:</strong> Optional - YYYY-MM-DD or
                  MM/DD/YYYY (e.g., 2025-01-15 or 1/15/2025)
                </p>
                <p>
                  <strong>Description:</strong> Optional - Additional notes
                </p>
                <p>
                  <strong>Employee Iqama ID:</strong> Optional - Assign to
                  employee by Iqama ID
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkUploadDialogOpen(false);
                setParsedVehicles([]);
                setValidationErrors([]);
                setUploadProgress(0);
              }}
              disabled={isUploading}
            >
              Close
            </Button>
            {parsedVehicles.length > 0 && (
              <Button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : `Upload ${parsedVehicles.length} Vehicle${parsedVehicles.length > 1 ? 's' : ''}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Vehicle Dialog */}
      <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Vehicle Contract</DialogTitle>
          </DialogHeader>
          {terminatingVehicle && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">
                  Vehicle: {terminatingVehicle.number} - {terminatingVehicle.name}
                </p>
                {terminatingVehicle.serialNumber && (
                  <p className="text-xs text-blue-700 mt-1">
                    Serial: {terminatingVehicle.serialNumber}
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
                  value={terminateFormData.terminationDate}
                  onChange={(e) =>
                    setTerminateFormData({
                      ...terminateFormData,
                      terminationDate: e.target.value,
                    })
                  }
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <Label htmlFor="terminationReason">
                  Termination Reason <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="terminationReason"
                  value={terminateFormData.terminationReason}
                  onChange={(e) =>
                    setTerminateFormData({
                      ...terminateFormData,
                      terminationReason: e.target.value,
                    })
                  }
                  placeholder="Enter reason for terminating this vehicle contract..."
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
                <p className="font-medium">Note:</p>
                <p className="mt-1">
                  Terminating a vehicle contract will mark it as inactive. The vehicle
                  can be viewed by enabling the "Show Terminated" filter.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTerminateDialogOpen(false);
                setTerminatingVehicle(null);
                setTerminateFormData({
                  terminationDate: new Date().toISOString().split("T")[0],
                  terminationReason: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminateConfirm}
              disabled={
                !terminateFormData.terminationDate ||
                !terminateFormData.terminationReason.trim()
              }
            >
              <Ban className="mr-2 h-4 w-4" />
              Terminate Contract
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

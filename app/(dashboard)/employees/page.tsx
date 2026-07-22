"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees, type Employee } from "@/contexts/EmployeeContext";
import { useVehicles } from "@/contexts/VehicleContext";
import { exportToExcel } from "@/lib/excel-utils";
import {
  Camera,
  Download,
  Edit,
  Eye,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
  UserX,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const {
    employees: contextEmployees,
    loading: contextLoading,
    refetchEmployees,
    pagination: contextPagination,
    goToPage,
    setItemsPerPage,
  } = useEmployees();
  const { vehicles: contextVehicles } = useVehicles();

  // Local state for search and filters only
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedEmployees, setParsedEmployees] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverErrors, setServerErrors] = useState<
    Array<{ row: number; name?: string; iqamaId?: string; error: string }>
  >([]);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [terminatingEmployee, setTerminatingEmployee] =
    useState<Employee | null>(null);
  const [terminateFormData, setTerminateFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [showTerminated, setShowTerminated] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "employee" | "agent">(
    "all",
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null,
  );

  function handlePageChange(page: number) {
    goToPage(page);
  }

  function handleItemsPerPageChange(limit: number) {
    setItemsPerPage(limit);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Only take the first file for profile photo

    // Create a preview URL for the image
    const previewUrl = URL.createObjectURL(file);
    setImageUrls([previewUrl]);
    setImageFile(file);

    e.target.value = "";
  }

  function handleRemoveImage() {
    setImageUrls([]);
    setImageFile(null);
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("nameRequired");
    }

    if (!/^\d{10}$/.test(formData.iqamaId)) {
      newErrors.iqamaId = t("iqamaIdMustBe10Digits");
    }

    // Phone is optional, but if provided, must match format
    if (
      formData.phone &&
      formData.phone.trim() !== "+966" &&
      !/^\+966\d{9}$/.test(formData.phone)
    ) {
      newErrors.phone = t("phoneFormatError");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const url = editingEmployee
        ? `/api/employees/${editingEmployee._id}`
        : "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";

      // Create FormData to send employee data with image file
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("iqamaId", formData.iqamaId);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("type", formData.type);
      if (formData.joinDate) {
        formDataToSend.append(
          "joinDate",
          new Date(formData.joinDate).toISOString(),
        );
      }

      // Add image file if selected
      if (imageFile) {
        formDataToSend.append("image", imageFile);
      }

      const res = await fetch(`${API_URL}${url}`, {
        method,
        body: formDataToSend,
      });

      const data = await res.json();

      if (data.success) {
        const employeeId = data.data._id;

        // Update vehicle assignments
        // First, unassign all vehicles that were previously assigned to this employee
        if (editingEmployee) {
          const previousVehicles = contextVehicles.filter((v) => {
            const empId =
              typeof v.employeeId === "object" && v.employeeId !== null
                ? (v.employeeId as any)._id
                : v.employeeId;
            return empId === editingEmployee._id;
          });
          const vehiclesToUnassign = previousVehicles.filter(
            (v) => !selectedVehicles.includes(v._id),
          );

          for (const vehicle of vehiclesToUnassign) {
            await fetch(`${API_URL}/api/vehicles/${vehicle._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
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
          const vehicle = contextVehicles.find((v) => v._id === vehicleId);
          if (vehicle) {
            // Extract only the necessary fields to avoid passing populated objects
            const empIdValue =
              typeof vehicle.employeeId === "object" &&
              vehicle.employeeId !== null
                ? (vehicle.employeeId as any)._id
                : vehicle.employeeId;

            await fetch(`${API_URL}/api/vehicles/${vehicleId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
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
            ? t("employeeUpdatedSuccess")
            : t("employeeCreatedSuccess"),
        );
        refetchEmployees();
        handleCloseDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      setErrors({ submit: t("errorOccurred") });
    } finally {
      setIsSubmitting(false);
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

  function handleDeleteClick(employee: Employee) {
    setDeletingEmployee(employee);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingEmployee) return;

    try {
      const res = await fetch(
        `${API_URL}/api/employees/${deletingEmployee._id}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success(t("employeeDeletedSuccess"));
        refetchEmployees();
        setIsDeleteDialogOpen(false);
        setDeletingEmployee(null);
      } else {
        toast.error(data.error || t("failedToDeleteEmployee"));
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error(t("errorDeletingEmployee"));
    }
  }

  async function handleTerminateConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!terminatingEmployee) return;

    if (!terminateFormData.date || !terminateFormData.reason.trim()) {
      toast.error(t("provideTerminationDateReason"));
      return;
    }

    try {
      // Get vehicles assigned to this employee
      const assignedVehicles = contextVehicles.filter((v) => {
        const empId =
          typeof v.employeeId === "object" && v.employeeId !== null
            ? (v.employeeId as any)._id
            : v.employeeId;
        return empId === terminatingEmployee._id;
      });

      // Unassign all vehicles
      for (const vehicle of assignedVehicles) {
        await fetch(`${API_URL}/api/vehicles/${vehicle._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: vehicle.number,
            name: vehicle.name,
            employeeId: null,
          }),
        });
      }

      // Terminate the employee (not delete)
      const res = await fetch(
        `${API_URL}/api/employees/${terminatingEmployee._id}/terminate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            terminationDate: terminateFormData.date,
            terminationReason: terminateFormData.reason,
          }),
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success(
          t("employeeTerminatedSuccess", { count: assignedVehicles.length }),
        );
        refetchEmployees();
        setIsTerminateDialogOpen(false);
        setTerminatingEmployee(null);
        setTerminateFormData({
          date: new Date().toISOString().split("T")[0],
          reason: "",
        });
      } else {
        toast.error(data.error || t("failedToTerminateEmployee"));
      }
    } catch (error) {
      console.error("Error terminating employee:", error);
      toast.error(t("errorTerminatingEmployee"));
    }
  }

  async function handleViewEmployee(employee: Employee) {
    try {
      const res = await fetch(`${API_URL}/api/employees/${employee._id}`, {});
      const data = await res.json();

      if (data.success) {
        setViewingEmployee(data.data);
        setIsViewDialogOpen(true);
      } else {
        toast.error(t("failedToFetchEmployeeDetails"));
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error(t("errorLoadingEmployeeData"));
    }
  }

  async function handleOpenDialog(employee?: Employee) {
    if (employee) {
      // Fetch complete employee data from API
      try {
        const res = await fetch(`${API_URL}/api/employees/${employee._id}`, {});
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
          setImageFile(null); // Reset image file when editing existing employee
          // Load vehicles assigned to this employee
          const assignedVehicles = contextVehicles
            .filter((v) => {
              // Handle both populated and non-populated employeeId
              const empId =
                typeof v.employeeId === "object" && v.employeeId !== null
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
      setFormData({
        name: "",
        iqamaId: "",
        phone: "+966",
        type: "employee",
        joinDate: "",
      });
      setSelectedVehicles([]);
      setImageUrls([]);
      setImageFile(null);
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData({
      name: "",
      iqamaId: "",
      phone: "+966",
      type: "employee",
      joinDate: "",
    });
    setSelectedVehicles([]);
    setImageUrls([]);
    setImageFile(null);
    setVehicleSearchTerm("");
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
    toast.success(t("templateDownloadedSuccess"));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const employees: any[] = [];
      const errors: string[] = [];

      // Clear any failures shown from a previous upload attempt
      setServerErrors([]);

      // Guard: if the header row doesn't match the template, every row would
      // otherwise fail with a confusing "missing required fields" message.
      const EXPECTED_HEADERS = [
        "Name",
        "Iqama ID (10 digits)",
        "Phone (966XXXXXXXXX) - Optional",
        "Type (employee/agent)",
        "Join Date (YYYY-MM-DD)",
        "Vehicle Number - Optional",
      ];
      if (
        jsonData.length > 0 &&
        !Object.keys(jsonData[0]).some((key) => EXPECTED_HEADERS.includes(key))
      ) {
        setParsedEmployees([]);
        setValidationErrors([t("columnHeadersMismatchDetail")]);
        toast.error(t("columnHeadersMismatch"));
        return;
      }

      // Validate and prepare all employees first
      for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex];
        // Excel row number: +2 because row 1 is the header and arrays are 0-based
        const rowNum = rowIndex + 2;
        try {
          // Validate required fields (phone is now optional)
          const missingFields: string[] = [];
          if (!row.Name) missingFields.push("Name");
          if (!row["Iqama ID (10 digits)"])
            missingFields.push("Iqama ID (10 digits)");
          if (missingFields.length > 0) {
            errors.push(
              `Row ${rowNum}: ${
                missingFields.length > 1
                  ? t("missingRequiredFields")
                  : t("missingRequiredField")
              } — ${missingFields.join(", ")}`,
            );
            continue;
          }

          const iqamaId = row["Iqama ID (10 digits)"].toString();
          let phone = row["Phone (966XXXXXXXXX)"]
            ? row["Phone (966XXXXXXXXX)"].toString().trim()
            : "";
          const type = (row["Type (employee/agent)"] || "employee")
            .toString()
            .trim()
            .toLowerCase();

          // Handle date conversion - Excel can return dates in various formats
          let joinDate = null;
          if (row["Join Date (YYYY-MM-DD)"]) {
            const rawDate = row["Join Date (YYYY-MM-DD)"];

            // If it's already a Date object (Excel sometimes does this)
            if (rawDate instanceof Date) {
              // Use UTC methods to avoid timezone issues
              const year = rawDate.getUTCFullYear();
              const month = String(rawDate.getUTCMonth() + 1).padStart(2, "0");
              const day = String(rawDate.getUTCDate()).padStart(2, "0");
              joinDate = `${year}-${month}-${day}`;
            }
            // If it's an Excel serial number (number of days since 1900-01-01)
            else if (typeof rawDate === "number") {
              // Excel epoch: January 1, 1900 (but Excel incorrectly treats 1900 as a leap year)
              const excelEpoch = new Date(Date.UTC(1900, 0, 1));
              const date = new Date(
                excelEpoch.getTime() + (rawDate - 2) * 24 * 60 * 60 * 1000,
              );
              // Use UTC methods to avoid timezone issues
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, "0");
              const day = String(date.getUTCDate()).padStart(2, "0");
              joinDate = `${year}-${month}-${day}`;
            }
            // If it's a string, try to parse it
            else if (typeof rawDate === "string") {
              const parsedDate = new Date(rawDate);
              if (!isNaN(parsedDate.getTime())) {
                // Use UTC methods to avoid timezone issues
                const year = parsedDate.getUTCFullYear();
                const month = String(parsedDate.getUTCMonth() + 1).padStart(
                  2,
                  "0",
                );
                const day = String(parsedDate.getUTCDate()).padStart(2, "0");
                joinDate = `${year}-${month}-${day}`;
              }
            }
          }

          // Validate iqama ID
          // if (!/^\d{10}$/.test(iqamaId)) {
          //   errors.push(`Row "${row.Name}": Iqama ID must be exactly 10 digits`);
          //   continue;
          // }

          // Phone is optional, but if provided, validate and format
          if (phone) {
            // Remove any spaces or dashes
            phone = phone.replace(/[\s-]/g, "");

            // If phone starts with 966 but not +966, add the +
            if (/^966\d{9}$/.test(phone)) {
              phone = "+" + phone;
            }

            // Now validate the final format
            // if (!/^\+966\d{9}$/.test(phone)) {
            //   errors.push(`Row "${row.Name}": Phone must be in format 966XXXXXXXXX or +966XXXXXXXXX`);
            //   continue;
            // }
          }

          // Validate type
          if (type !== "employee" && type !== "agent") {
            const rawType = row["Type (employee/agent)"];
            errors.push(
              `Row ${rowNum} (${row.Name}): Type "${rawType ?? ""}" ${t("typeNotRecognized")}`,
            );
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
          errors.push(`Row ${rowNum} (${row.Name}): ${error}`);
        }
      }

      // Store validation errors and parsed employees
      setValidationErrors(errors);
      setParsedEmployees(employees);

      // If there are validation errors, show them
      if (errors.length > 0) {
        toast.warning(`${errors.length} ${t("rowsFailedValidation")}`);
      }

      // If there are no valid employees, show error
      if (employees.length === 0) {
        toast.error(t("noValidEmployeesFound"));
        setParsedEmployees([]);
        setValidationErrors(errors);
      } else {
        toast.success(`${employees.length} ${t("employeesReadyToUpload")}`);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(t("errorProcessingFile"));
    } finally {
      // Reset file input
      e.target.value = "";
    }
  }

  async function handleBulkUploadSubmit() {
    if (parsedEmployees.length === 0) {
      toast.error(t("noEmployeesToUpload"));
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

      // Send all employees in a single request
      const res = await fetch(`${API_URL}/api/employees/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: parsedEmployees }),
      });

      const result = await res.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Delay for animation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (result.success) {
        const serverErrs = result.data?.errors || [];
        const createdCount = result.data?.created ?? 0;

        if (serverErrs.length > 0) {
          // Some/all rows were rejected by the server — keep the dialog open and
          // show exactly which rows failed and why.
          setServerErrors(serverErrs);
          if (createdCount > 0) {
            toast.warning(
              `${createdCount} ${t("uploadedAndFailed", { failed: serverErrs.length })}`,
            );
          } else {
            toast.error(t("allRowsFailed", { count: serverErrs.length }));
          }
          refetchEmployees();
          setParsedEmployees([]);
          setUploadProgress(0);
        } else {
          toast.success(result.message || t("employeesUploadedSuccess"));
          refetchEmployees();
          setIsBulkUploadDialogOpen(false);
          setParsedEmployees([]);
          setValidationErrors([]);
          setServerErrors([]);
          setUploadProgress(0);
        }
      } else {
        toast.error(result.error || t("failedToUploadEmployees"));
        if (result.data?.errors?.length > 0) {
          setServerErrors(result.data.errors);
        }
      }
    } catch (error) {
      console.error("Error uploading employees:", error);
      toast.error(t("errorUploadingEmployees"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  if (contextLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Calculate summary stats
  const totalEmployees = contextPagination.totalItems;
  const displayEmployees = contextEmployees.filter((emp) => {
    // Apply type filter
    if (typeFilter !== "all" && emp.type !== typeFilter) {
      return false;
    }

    // Apply terminated filter
    if (showTerminated && !emp.terminationDate) {
      return false;
    }
    if (!showTerminated && emp.terminationDate) {
      return false;
    }

    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        emp.name.toLowerCase().includes(searchLower) ||
        emp.iqamaId?.includes(searchTerm) ||
        emp.phone?.includes(searchTerm)
      );
    }

    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("employees")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("bulkUpload")}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addEmployee")}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-blue-700">
            {t("totalEmployees")}
          </p>
          <p className="text-2xl font-bold text-blue-900">{totalEmployees}</p>
        </div>
        {/* <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-green-700">Current Page</p>
          <p className="text-2xl font-bold text-green-900">
            {employees.length}
          </p>
        </div> */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-purple-700">{t("page")}</p>
          <p className="text-2xl font-bold text-purple-900">
            {contextPagination.currentPage} / {contextPagination.totalPages}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg shadow p-4">
          <p className="text-sm font-medium text-amber-700">
            {searchTerm ? t("searchResults") : t("viewing")}
          </p>
          <p className="text-2xl font-bold text-amber-900">
            {displayEmployees.length}
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        {/* Search and Filters Row */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("searchEmployeesPlaceholder")}
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
        </div>

        {/* Filter Buttons Row */}
        <div className="flex gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={typeFilter === "all" ? "default" : "ghost"}
              onClick={() => setTypeFilter("all")}
              className="h-8"
            >
              {t("allTypes")}
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "employee" ? "default" : "ghost"}
              onClick={() => setTypeFilter("employee")}
              className="h-8"
            >
              {t("employees")}
            </Button>
            <Button
              size="sm"
              variant={typeFilter === "agent" ? "default" : "ghost"}
              onClick={() => setTypeFilter("agent")}
              className="h-8"
            >
              {t("agents")}
            </Button>
          </div>

          {/* Terminated Filter */}
          <Button
            size="sm"
            variant={showTerminated ? "destructive" : "outline"}
            onClick={() => setShowTerminated(!showTerminated)}
            className="h-8"
          >
            <UserX className="mr-2 h-4 w-4" />
            {showTerminated ? t("showingTerminated") : t("showTerminated")}
          </Button>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || showTerminated || typeFilter !== "all") && (
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-gray-500 font-medium">
              {t("activeFilters")}
            </span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                {t("search")}: {searchTerm}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}
            {typeFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {t("type")}:{" "}
                {typeFilter === "employee" ? t("employees") : t("agents")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setTypeFilter("all")}
                />
              </Badge>
            )}
            {showTerminated && (
              <Badge variant="destructive" className="gap-1">
                {t("terminatedOnly")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setShowTerminated(false)}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-y-scroll h-[450px]">
        <table className="min-w-full divide-y divide-gray-200 ">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("siNo")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("image")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("name")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("iqamaId")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("phone")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("type")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("assignedVehicles")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayEmployees.map((employee, i) => {
              // Get vehicles assigned to this employee
              const assignedVehicles = contextVehicles
                .filter((v) => {
                  const empId =
                    typeof v.employeeId === "object" && v.employeeId !== null
                      ? (v.employeeId as any)._id
                      : v.employeeId;
                  return empId === employee._id;
                })
                .map((v) => v.number)
                .join(", ");

              return (
                <tr key={employee._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(contextPagination.currentPage - 1) *
                      contextPagination.itemsPerPage +
                      i +
                      1}
                  </td>
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
                    <Badge
                      variant={
                        employee.type === "agent" ? "default" : "secondary"
                      }
                    >
                      {employee.type === "agent" ? t("agent") : t("employee")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {assignedVehicles ? (
                      <div className="space-y-1">
                        {assignedVehicles.split(", ").map((vehicle, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium"
                          >
                            {vehicle}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">
                        {t("noVehicles")}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewEmployee(employee)}
                      title={t("viewEmployee")}
                    >
                      <Eye className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(employee)}
                      title={t("editEmployee")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTerminateClick(employee)}
                      title={t("terminateEmployee")}
                    >
                      <UserX className="h-4 w-4 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(employee)}
                      title={t("deleteEmployee")}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? t("noEmployeesFoundSearch") : t("noEmployeesFound")}
          </div>
        )}

        {/* Pagination */}
      </div>
      <Pagination
        currentPage={contextPagination.currentPage}
        totalPages={contextPagination.totalPages}
        totalItems={contextPagination.totalItems}
        itemsPerPage={contextPagination.itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? t("editEmployee") : t("addEmployee")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Profile Photo Section - Top */}
              <div className="flex flex-col items-center justify-center pb-6 border-b">
                <div className="relative group">
                  {/* Circular Image Container */}
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-300 shadow-lg flex items-center justify-center">
                    {imageUrls.length > 0 ? (
                      <Image
                        src={imageUrls[0]}
                        alt="Profile photo"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User
                        className="w-16 h-16 text-blue-400"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>

                  {/* Edit/Upload Button Overlay */}
                  <label
                    htmlFor="profile-image-upload-input"
                    className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2.5 shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                      id="profile-image-upload-input"
                    />
                    <Camera className="h-5 w-5" />
                  </label>

                  {/* Remove Button (only show if image exists) */}
                  {imageUrls.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                      title="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {uploadingImage && (
                  <p className="text-xs text-blue-600 mt-3 flex items-center gap-2">
                    <LoadingSpinner /> {t("uploading")}
                  </p>
                )}
                {imageUrls.length > 0 && !uploadingImage && (
                  <p className="text-xs text-gray-500 mt-3">
                    {imageFile
                      ? t("photoSelectedWillUpload")
                      : t("photoUploaded")}
                  </p>
                )}
              </div>

              {/* Employee Details */}
              <div>
                <Label htmlFor="name">{t("name")}</Label>
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
                <Label htmlFor="iqamaId">{t("iqamaIdDigits")}</Label>
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
                <Label htmlFor="phone">{t("phoneOptional")}</Label>
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
                <Label htmlFor="type">{t("type")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type: value as "employee" | "agent",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t("employee")}</SelectItem>
                    <SelectItem value="agent">{t("agent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="joinDate">{t("joinDate")}</Label>
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
                <Label>{t("assignVehiclesOptional")}</Label>
                {/* Vehicle Search */}
                <div className="mt-2 mb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t("searchVehiclesPlaceholder")}
                      value={vehicleSearchTerm}
                      onChange={(e) => setVehicleSearchTerm(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {contextVehicles.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {t("noVehiclesAvailable")}
                    </p>
                  ) : (
                    (() => {
                      // Filter vehicles based on search term
                      const filteredVehicles = contextVehicles.filter(
                        (vehicle) => {
                          const searchLower = vehicleSearchTerm.toLowerCase();
                          return (
                            vehicle.number
                              .toLowerCase()
                              .includes(searchLower) ||
                            vehicle.name.toLowerCase().includes(searchLower)
                          );
                        },
                      );

                      // Sort vehicles so checked ones appear at top
                      const sortedVehicles = [...filteredVehicles].sort(
                        (a, b) => {
                          const aIsChecked = selectedVehicles.includes(a._id);
                          const bIsChecked = selectedVehicles.includes(b._id);
                          if (aIsChecked === bIsChecked) return 0;
                          return aIsChecked ? -1 : 1;
                        },
                      );

                      if (sortedVehicles.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 italic">
                            {t("noVehiclesFoundMatching")} &quot;
                            {vehicleSearchTerm}&quot;
                          </p>
                        );
                      }

                      return sortedVehicles.map((vehicle) => (
                        <div
                          key={vehicle._id}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={`vehicle-${vehicle._id}`}
                            checked={selectedVehicles.includes(vehicle._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVehicles([
                                  ...selectedVehicles,
                                  vehicle._id,
                                ]);
                              } else {
                                setSelectedVehicles(
                                  selectedVehicles.filter(
                                    (id) => id !== vehicle._id,
                                  ),
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
                              const empId =
                                typeof vehicle.employeeId === "object" &&
                                vehicle.employeeId !== null
                                  ? (vehicle.employeeId as any)._id
                                  : vehicle.employeeId;

                              // Show "Already assigned" only if vehicle is assigned to a different employee
                              return (
                                empId &&
                                empId !== editingEmployee?._id && (
                                  <span className="text-xs text-red-500 ml-2">
                                    {t("alreadyAssigned")}
                                  </span>
                                )
                              );
                            })()}
                          </label>
                        </div>
                      ));
                    })()
                  )}
                </div>
                {selectedVehicles.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedVehicles.length} {t("vehiclesSelected")}
                  </p>
                )}
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner />
                    {editingEmployee ? t("updating") : t("creating")}
                  </>
                ) : editingEmployee ? (
                  t("update")
                ) : (
                  t("create")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("employeeDetails")}</DialogTitle>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-4">
              {/* Profile Photo Section - Top */}
              <div className="flex flex-col items-center justify-center pb-4 border-b">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-300 shadow-lg flex items-center justify-center mb-3">
                  {viewingEmployee.imageUrls &&
                  viewingEmployee.imageUrls.length > 0 ? (
                    <Image
                      src={viewingEmployee.imageUrls[0]}
                      alt="Profile photo"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User
                      className="w-16 h-16 text-blue-400"
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {viewingEmployee.name}
                </h3>
              </div>

              {/* Employee Details - Read Only */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">{t("name")}</Label>
                  <p className="text-lg font-medium">{viewingEmployee.name}</p>
                </div>
                <div>
                  <Label className="text-gray-600">{t("iqamaId")}</Label>
                  <p className="text-lg font-medium">
                    {viewingEmployee.iqamaId}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">{t("phone")}</Label>
                  <p className="text-lg font-medium">
                    {viewingEmployee.phone || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">{t("type")}</Label>
                  <div>
                    <Badge
                      variant={
                        viewingEmployee.type === "agent"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {viewingEmployee.type === "agent"
                        ? t("agent")
                        : t("employee")}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">{t("joinDate")}</Label>
                  <p className="text-lg font-medium">
                    {viewingEmployee.joinDate
                      ? new Date(viewingEmployee.joinDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">
                    {t("assignedVehicles")}
                  </Label>
                  <p className="text-lg font-medium">
                    {(() => {
                      const assignedVehicles = contextVehicles
                        .filter((v) => {
                          const empId =
                            typeof v.employeeId === "object" &&
                            v.employeeId !== null
                              ? (v.employeeId as any)._id
                              : v.employeeId;
                          return empId === viewingEmployee._id;
                        })
                        .map((v) => v.number)
                        .join(", ");
                      return (
                        assignedVehicles || (
                          <span className="text-gray-400 italic text-sm">
                            {t("noVehicles")}
                          </span>
                        )
                      );
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("close")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsViewDialogOpen(false);
                if (viewingEmployee) {
                  handleOpenDialog(viewingEmployee);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("edit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog
        open={isBulkUploadDialogOpen}
        onOpenChange={setIsBulkUploadDialogOpen}
      >
        <DialogContent
          className="max-w-2xl max-h-[80vh] flex flex-col"
          // Prevent the dialog from closing when the native file picker steals
          // and returns focus (Radix treats that as an "interact outside").
          // Close via the Close/X buttons or Escape instead.
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("bulkUploadEmployees")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                {t("instructions")}
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>{t("bulkStep1")}</li>
                <li>{t("bulkStep2")}</li>
                <li>{t("bulkStep3")}</li>
                <li>{t("bulkStep4")}</li>
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
                  {t("downloadTemplate")}
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
                    {t("selectExcelFile")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            {parsedEmployees.length > 0 && (
              <div className="border border-gray-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {t("preview")} ({parsedEmployees.length} {t("employeesReady")}
                  )
                </h3>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded p-3">
                  <div className="space-y-2 text-sm">
                    {parsedEmployees.slice(0, 5).map((emp, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center border-b border-gray-200 pb-2"
                      >
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-gray-600">{emp.iqamaId}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {emp.type}
                        </span>
                      </div>
                    ))}
                    {parsedEmployees.length > 5 && (
                      <p className="text-gray-500 text-center pt-2">
                        ...and {parsedEmployees.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rows rejected during file validation (before upload) */}
            {validationErrors.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <p className="font-semibold text-yellow-800 mb-1">
                  {validationErrors.length} {t("rowsHadProblems")}
                </p>
                <div className="max-h-40 overflow-y-auto text-yellow-700 space-y-0.5">
                  {validationErrors.map((err, idx) => (
                    <p key={idx} className="text-xs">
                      • {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Rows rejected by the server during upload */}
            {serverErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                <p className="font-semibold text-red-800 mb-2">
                  {serverErrors.length} {t("rowsFailedToUpload")}
                </p>
                <div className="max-h-52 overflow-y-auto space-y-2">
                  {serverErrors.map((err, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-red-700 border-b border-red-100 pb-1"
                    >
                      <span className="font-medium">
                        {t("row")} {err.row}
                        {err.name && err.name !== "Unknown"
                          ? ` (${err.name})`
                          : ""}
                        :
                      </span>{" "}
                      {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t("uploadingEmployees")}</span>
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
              <h4 className="font-semibold text-sm mb-2">
                {t("templateFormat")}
              </h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <strong>{t("templateFieldName")}</strong>{" "}
                  {t("templateFieldNameDesc")}
                </p>
                <p>
                  <strong>{t("templateFieldIqama")}</strong>{" "}
                  {t("templateFieldIqamaDesc")}
                </p>
                <p>
                  <strong>{t("templateFieldPhone")}</strong>{" "}
                  {t("templateFieldPhoneDesc")}
                </p>
                <p>
                  <strong>{t("templateFieldType")}</strong>{" "}
                  {t("templateFieldTypeDesc")}
                </p>
                <p>
                  <strong>{t("templateFieldJoinDate")}</strong>{" "}
                  {t("templateFieldJoinDateDesc")}
                </p>
                <p>
                  <strong>{t("templateFieldVehicle")}</strong>{" "}
                  {t("templateFieldVehicleDesc")}
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
                setParsedEmployees([]);
                setValidationErrors([]);
                setServerErrors([]);
                setUploadProgress(0);
              }}
              disabled={isUploading}
            >
              {t("close")}
            </Button>
            {parsedEmployees.length > 0 && (
              <Button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading
                  ? t("uploading")
                  : t("uploadEmployeeCount", {
                      count: parsedEmployees.length,
                      plural: parsedEmployees.length > 1 ? "s" : "",
                    })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Employee Dialog */}
      <Dialog
        open={isTerminateDialogOpen}
        onOpenChange={setIsTerminateDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("terminateEmployee")}</DialogTitle>
          </DialogHeader>
          {terminatingEmployee && (
            <form onSubmit={handleTerminateConfirm}>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>{t("warning")}</strong> {t("aboutToTerminate")}{" "}
                    <strong>{terminatingEmployee.name}</strong>.
                  </p>
                  {contextVehicles.filter((v) => {
                    const empId =
                      typeof v.employeeId === "object" && v.employeeId !== null
                        ? (v.employeeId as any)._id
                        : v.employeeId;
                    return empId === terminatingEmployee._id;
                  }).length > 0 && (
                    <p className="text-sm text-yellow-800 mt-2">
                      <strong>
                        {
                          contextVehicles.filter((v) => {
                            const empId =
                              typeof v.employeeId === "object" &&
                              v.employeeId !== null
                                ? (v.employeeId as any)._id
                                : v.employeeId;
                            return empId === terminatingEmployee._id;
                          }).length
                        }
                      </strong>{" "}
                      {t("assignedVehiclesWillBeUnassigned")}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="terminationDate">
                    {t("terminationDate")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="terminationDate"
                    type="date"
                    value={terminateFormData.date}
                    onChange={(e) =>
                      setTerminateFormData({
                        ...terminateFormData,
                        date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="terminationReason">
                    {t("reasonForTermination")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="terminationReason"
                    value={terminateFormData.reason}
                    onChange={(e) =>
                      setTerminateFormData({
                        ...terminateFormData,
                        reason: e.target.value,
                      })
                    }
                    placeholder={t("enterTerminationReason")}
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
                  {t("cancel")}
                </Button>
                <Button type="submit" variant="destructive">
                  {t("terminateEmployee")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={t("deleteEmployeeConfirmTitle")}
        description={t("deleteEmployeeConfirmDesc", {
          name: deletingEmployee?.name || t("thisEmployee"),
        })}
        confirmText={t("delete")}
        variant="destructive"
      />
    </div>
  );
}
//

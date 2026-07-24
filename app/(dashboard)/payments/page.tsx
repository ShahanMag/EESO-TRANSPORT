"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVehicles, type Vehicle } from "@/contexts/VehicleContext";
import { useYearFilter } from "@/contexts/YearFilterContext";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import {
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface UpdatedByList {
  _id: string;
  username: string;
}

interface Installment {
  _id: string;
  paymentId: string;
  amount: number;
  date: string;
  remarks?: string;
  installmentType?: "REGULAR" | "DOWN_PAYMENT";
  updatedBy: UpdatedByList;
}

interface EmiExtension {
  date: string;
  monthsAdded: number;
  interestPercent: number;
  interestAmount: number;
  dueBeforeInterest: number;
  dueAfterInterest: number;
  previousDueDate: string;
  newDueDate: string;
}

interface EmiInfo {
  periodMonths: number;
  startDate: string;
  dueDate: string;
  status: "ACTIVE" | "OVERDUE" | "COMPLETED";
  canExtend: boolean;
  daysOverdue: number;
  extensions: EmiExtension[];
}

interface Payment {
  _id: string;
  vehicleId: { _id: string; number: string; name: string } | null;
  totalAmount: number;
  originalAmount?: number;
  paymentType: "FULL" | "EMI";
  downPayment: number;
  date: string;
  remarks?: string;
}

interface PaymentWithInstallments extends Payment {
  installments: Installment[];
  paidAmount: number;
  dues: number;
  status: "unpaid" | "partial" | "paid";
  emi: EmiInfo | null;
  updatedBy: UpdatedByList;
}

interface VehiclePaymentGroup {
  vehicle: Vehicle;
  payments: PaymentWithInstallments[];
  totalAmount: number;
  totalPaid: number;
  totalDues: number;
}

export default function PaymentsPage() {
  const { vehicles: contextVehicles } = useVehicles();
  const { selectedYear } = useYearFilter();

  const [payments, setPayments] = useState<PaymentWithInstallments[]>([]);
  const [vehicleGroups, setVehicleGroups] = useState<VehiclePaymentGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<VehiclePaymentGroup[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    currentPage: { totalAmount: 0, paidAmount: 0, dueAmount: 0 },
    total: { totalAmount: 0, paidAmount: 0, dueAmount: 0 },
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25,
  });
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [isExtendEmiDialogOpen, setIsExtendEmiDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<PaymentWithInstallments | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentWithInstallments | null>(null);
  const [extendingPayment, setExtendingPayment] =
    useState<PaymentWithInstallments | null>(null);
  const [editingInstallment, setEditingInstallment] =
    useState<Installment | null>(null);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(
    new Set(),
  );
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(
    new Set(),
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    type: "payment" | "installment" | null;
    id: string | null;
  }>({ open: false, type: null, id: null });
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [isSearchingVehicles, setIsSearchingVehicles] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentFormData, setPaymentFormData] = useState({
    vehicleId: "",
    totalAmount: "",
    paymentType: "FULL" as "FULL" | "EMI",
    downPayment: "",
    emiPeriodMonths: "6",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const [installmentFormData, setInstallmentFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const [extendFormData, setExtendFormData] = useState({
    interestPercent: "",
    additionalMonths: "1",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    fetchPayments(1, pagination.itemsPerPage, searchTerm);
  }, [statusFilter, selectedYear]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(1, pagination.itemsPerPage, searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  function toggleStatusFilter(status: string) {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }

  const searchedVehicles =
    vehicleSearchTerm.trim() === ""
      ? contextVehicles
      : contextVehicles.filter(
          (v) =>
            v.number.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
            v.name.toLowerCase().includes(vehicleSearchTerm.toLowerCase()),
        );

  useEffect(() => {
    const groups: Map<string, VehiclePaymentGroup> = new Map();

    payments.forEach((payment) => {
      if (!payment.vehicleId) return;

      const vehicleId = payment.vehicleId._id;

      if (!groups.has(vehicleId)) {
        const fullVehicle = contextVehicles.find((v) => v._id === vehicleId);
        groups.set(vehicleId, {
          vehicle: fullVehicle || {
            _id: payment.vehicleId._id,
            number: payment.vehicleId.number,
            name: payment.vehicleId.name,
            type: "private",
            employeeId: null,
          },
          payments: [],
          totalAmount: 0,
          totalPaid: 0,
          totalDues: 0,
        });
      }

      const group = groups.get(vehicleId)!;
      group.payments.push(payment);
      group.totalAmount += payment.totalAmount;
      group.totalPaid += payment.paidAmount;
      group.totalDues += payment.dues;
    });

    const groupsArray = Array.from(groups.values());
    setVehicleGroups(groupsArray);
    setFilteredGroups(groupsArray);
  }, [payments]);

  function handlePageChange(page: number) {
    fetchPayments(page, pagination.itemsPerPage, searchTerm);
  }

  function handleItemsPerPageChange(limit: number) {
    fetchPayments(1, limit, searchTerm);
  }

  async function fetchPayments(
    page = pagination.currentPage,
    limit = pagination.itemsPerPage,
    search = searchTerm,
  ) {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search && search.trim() !== "") {
        params.append("search", search.trim());
      }

      statusFilter.forEach((status) => {
        params.append("status", status);
      });

      params.append("year", selectedYear.toString());

      const [paymentsRes, installmentsRes] = await Promise.all([
        fetch(`${API_URL}/api/payments?${params.toString()}`, {}),
        fetch(`${API_URL}/api/installments?year=${selectedYear}`, {}),
      ]);

      const [paymentsData, allInstallmentsData] = await Promise.all([
        paymentsRes.json(),
        installmentsRes.json(),
      ]);

      if (paymentsData.success) {
        if (paymentsData.pagination) {
          setPagination({
            currentPage: paymentsData.pagination.page,
            totalPages: paymentsData.pagination.totalPages,
            totalItems: paymentsData.pagination.total,
            itemsPerPage: paymentsData.pagination.limit,
          });
        }

        if (paymentsData.summary) {
          setSummary(paymentsData.summary);
        }

        // Group installments by paymentId for the history table under each payment
        const installmentsByPaymentId: Record<string, Installment[]> = {};
        if (allInstallmentsData.success) {
          allInstallmentsData.data.forEach((inst: Installment) => {
            if (!installmentsByPaymentId[inst.paymentId]) {
              installmentsByPaymentId[inst.paymentId] = [];
            }
            installmentsByPaymentId[inst.paymentId].push(inst);
          });
        }

        // The backend already computes paidAmount/dueAmount/status/emi per payment
        // (see computePaymentView) — trust that instead of recalculating here,
        // so the UI can never drift out of sync with the source of truth.
        const paymentsWithInstallments = paymentsData.data.map(
          (payment: any) => ({
            ...payment,
            installments: installmentsByPaymentId[payment._id] || [],
            dues: payment.dueAmount,
          }),
        );

        setPayments(paymentsWithInstallments);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function validatePaymentForm() {
    const newErrors: Record<string, string> = {};

    if (!paymentFormData.vehicleId) {
      newErrors.vehicleId = "Vehicle is required";
    }

    const totalAmount = parseFloat(paymentFormData.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      newErrors.totalAmount = "Total amount must be a positive number";
    }

    if (paymentFormData.paymentType === "EMI" && !editingPayment) {
      const downPayment = parseFloat(paymentFormData.downPayment || "0");
      if (isNaN(downPayment) || downPayment < 0) {
        newErrors.downPayment = "Down payment cannot be negative";
      } else if (!isNaN(totalAmount) && downPayment >= totalAmount) {
        newErrors.downPayment = "Down payment must be less than total amount";
      }

      const emiPeriodMonths = parseInt(paymentFormData.emiPeriodMonths, 10);
      if (isNaN(emiPeriodMonths) || emiPeriodMonths <= 0) {
        newErrors.emiPeriodMonths =
          "EMI period must be a positive number of months";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateInstallmentForm() {
    const newErrors: Record<string, string> = {};

    const amount = parseFloat(installmentFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = "Amount must be a positive number";
    }

    if (selectedPayment && !editingInstallment) {
      const totalInstallments = selectedPayment.paidAmount + amount;
      if (totalInstallments > selectedPayment.totalAmount) {
        newErrors.amount = `Total installments (${formatCurrency(totalInstallments)}) cannot exceed total amount (${formatCurrency(selectedPayment.totalAmount)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateExtendForm() {
    const newErrors: Record<string, string> = {};

    const interestPercent = parseFloat(extendFormData.interestPercent);
    if (isNaN(interestPercent) || interestPercent < 0) {
      newErrors.interestPercent =
        "Interest % must be zero or a positive number";
    }

    const additionalMonths = parseInt(extendFormData.additionalMonths, 10);
    if (!Number.isInteger(additionalMonths) || additionalMonths <= 0) {
      newErrors.additionalMonths = "Months must be a positive whole number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePaymentForm()) return;

    setIsSubmitting(true);
    try {
      const url = editingPayment
        ? `/api/payments/${editingPayment._id}`
        : "/api/payments";
      const method = editingPayment ? "PUT" : "POST";

      // paymentType/downPayment/emiPeriodMonths only matter on create —
      // the PUT route ignores them intentionally (see backend comments)
      const body: any = {
        vehicleId: paymentFormData.vehicleId,
        totalAmount: parseFloat(paymentFormData.totalAmount),
        date: new Date(paymentFormData.date),
        remarks: paymentFormData.remarks,
      };

      if (!editingPayment) {
        body.paymentType = paymentFormData.paymentType;
        if (paymentFormData.paymentType === "EMI") {
          body.downPayment = parseFloat(paymentFormData.downPayment || "0");
          body.emiPeriodMonths = parseInt(paymentFormData.emiPeriodMonths, 10);
        }
      }

      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingPayment
            ? "Payment updated successfully"
            : "Payment created successfully",
        );
        fetchPayments(
          pagination.currentPage,
          pagination.itemsPerPage,
          searchTerm,
        );
        handleClosePaymentDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      setErrors({ submit: "An error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInstallmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateInstallmentForm() || !selectedPayment) return;

    try {
      const url = editingInstallment
        ? `/api/installments/${editingInstallment._id}`
        : "/api/installments";
      const method = editingInstallment ? "PUT" : "POST";

      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPayment._id,
          amount: parseFloat(installmentFormData.amount),
          date: new Date(installmentFormData.date),
          remarks: installmentFormData.remarks,
        }),
      });

      const data = await res.json();

      if (data.success) {
        fetchPayments(
          pagination.currentPage,
          pagination.itemsPerPage,
          searchTerm,
        );
        handleCloseInstallmentDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving installment:", error);
      setErrors({ submit: "An error occurred" });
    }
  }

  async function handleExtendEmiSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateExtendForm() || !extendingPayment) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/payments/${extendingPayment._id}/extend-emi`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interestPercent: parseFloat(extendFormData.interestPercent),
            additionalMonths: parseInt(extendFormData.additionalMonths, 10),
          }),
        },
      );

      const data = await res.json();

      if (data.success) {
        toast.success("EMI extended successfully");
        fetchPayments(
          pagination.currentPage,
          pagination.itemsPerPage,
          searchTerm,
        );
        handleCloseExtendEmiDialog();
      } else {
        setErrors({ submit: data.error || "Failed to extend EMI" });
      }
    } catch (error) {
      console.error("Error extending EMI:", error);
      setErrors({ submit: "An error occurred while extending EMI" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeletePayment(id: string) {
    setDeleteConfirmation({ open: true, type: "payment", id });
  }

  async function confirmDeletePayment() {
    if (!deleteConfirmation.id) return;

    try {
      const res = await fetch(
        `${API_URL}/api/payments/${deleteConfirmation.id}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Payment deleted successfully");
        fetchPayments(
          pagination.currentPage,
          pagination.itemsPerPage,
          searchTerm,
        );
      } else {
        toast.error(data.error || "Failed to delete payment");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("An error occurred while deleting payment");
    } finally {
      setDeleteConfirmation({ open: false, type: null, id: null });
    }
  }

  function handleDeleteInstallment(id: string) {
    setDeleteConfirmation({ open: true, type: "installment", id });
  }

  async function confirmDeleteInstallment() {
    if (!deleteConfirmation.id) return;

    try {
      const res = await fetch(
        `${API_URL}/api/installments/${deleteConfirmation.id}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Installment deleted successfully");
        fetchPayments(
          pagination.currentPage,
          pagination.itemsPerPage,
          searchTerm,
        );
      } else {
        toast.error(data.error || "Failed to delete installment");
      }
    } catch (error) {
      console.error("Error deleting installment:", error);
      toast.error("An error occurred while deleting installment");
    } finally {
      setDeleteConfirmation({ open: false, type: null, id: null });
    }
  }

  function handleOpenPaymentDialog(payment?: PaymentWithInstallments) {
    if (payment) {
      setEditingPayment(payment);
      setPaymentFormData({
        vehicleId: payment.vehicleId ? payment.vehicleId._id : "",
        totalAmount: payment.totalAmount.toString(),
        paymentType: payment.paymentType || "FULL",
        downPayment: (payment.downPayment || 0).toString(),
        emiPeriodMonths: (payment.emi?.periodMonths || 6).toString(),
        date: new Date(payment.date).toISOString().split("T")[0],
        remarks: payment.remarks || "",
      });
    } else {
      setEditingPayment(null);
      setPaymentFormData({
        vehicleId: "",
        totalAmount: "",
        paymentType: "FULL",
        downPayment: "",
        emiPeriodMonths: "6",
        date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
      setVehicleSearchTerm("");
    }
    setErrors({});
    setIsPaymentDialogOpen(true);
  }

  function handleClosePaymentDialog() {
    setIsPaymentDialogOpen(false);
    setEditingPayment(null);
    setVehicleSearchTerm("");
    setErrors({});
  }

  function handleOpenInstallmentDialog(
    payment: PaymentWithInstallments,
    installment?: Installment,
  ) {
    setSelectedPayment(payment);
    if (installment) {
      setEditingInstallment(installment);
      setInstallmentFormData({
        amount: installment.amount.toString(),
        date: new Date(installment.date).toISOString().split("T")[0],
        remarks: installment.remarks || "",
      });
    } else {
      setEditingInstallment(null);
      setInstallmentFormData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
    }
    setErrors({});
    setIsInstallmentDialogOpen(true);
  }

  function handleCloseInstallmentDialog() {
    setIsInstallmentDialogOpen(false);
    setSelectedPayment(null);
    setEditingInstallment(null);
    setErrors({});
  }

  function handleOpenExtendEmiDialog(payment: PaymentWithInstallments) {
    setExtendingPayment(payment);
    setExtendFormData({ interestPercent: "", additionalMonths: "1" });
    setErrors({});
    setIsExtendEmiDialogOpen(true);
  }

  function handleCloseExtendEmiDialog() {
    setIsExtendEmiDialogOpen(false);
    setExtendingPayment(null);
    setErrors({});
  }

  function toggleVehicleExpand(vehicleId: string) {
    setExpandedVehicles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  }

  function togglePaymentExpand(paymentId: string) {
    setExpandedPayments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  }

  function getStatusBadge(totalAmount: number, paidAmount: number) {
    const status = getPaymentStatus(totalAmount, paidAmount);
    const variant =
      status === "paid"
        ? "success"
        : status === "partial"
          ? "warning"
          : "danger";
    return <Badge variant={variant}>{status}</Badge>;
  }

  function getEmiStatusBadge(emi: EmiInfo) {
    const variant =
      emi.status === "COMPLETED"
        ? "success"
        : emi.status === "OVERDUE"
          ? "danger"
          : "default";
    return <Badge variant={variant}>{emi.status}</Badge>;
  }

  const totalAmount = filteredGroups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalPaid = filteredGroups.reduce((sum, g) => sum + g.totalPaid, 0);
  const totalDues = totalAmount - totalPaid;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vehicle Payments</h1>
        <Button onClick={() => handleOpenPaymentDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Total Amount (All)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(summary.total.totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Paid (All)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(summary.total.paidAmount)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Total Dues (All)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(summary.total.dueAmount)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {pagination.totalItems}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Page {pagination.currentPage} / {pagination.totalPages}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="flex-1">
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
        <div className="flex gap-2">
          <Button
            variant={statusFilter.includes("paid") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("paid")}
            className="h-10"
          >
            {statusFilter.includes("paid") && (
              <Check className="mr-2 h-4 w-4" />
            )}
            Paid
          </Button>
          <Button
            variant={statusFilter.includes("unpaid") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("unpaid")}
            className="h-10"
          >
            {statusFilter.includes("unpaid") && (
              <Check className="mr-2 h-4 w-4" />
            )}
            Unpaid
          </Button>
          <Button
            variant={statusFilter.includes("partial") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleStatusFilter("partial")}
            className="h-10"
          >
            {statusFilter.includes("partial") && (
              <Check className="mr-2 h-4 w-4" />
            )}
            Partial
          </Button>
          {statusFilter.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter([])}
              className="h-10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 overflow-y-scroll h-[450px] pr-2">
        {filteredGroups.map((group) => {
          const isVehicleExpanded = expandedVehicles.has(group.vehicle._id);
          return (
            <div
              key={group.vehicle._id}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md border border-blue-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVehicleExpand(group.vehicle._id)}
                      className="hover:bg-blue-100"
                    >
                      {isVehicleExpanded ? (
                        <ChevronDown className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-blue-600" />
                      )}
                    </Button>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-200 p-2 rounded-lg">
                        <Car className="h-6 w-6 text-blue-700" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-blue-900">
                          {group.vehicle.number}
                        </h3>
                        <p className="text-sm text-blue-700">
                          {group.vehicle.name}
                        </p>
                        <p className="text-xs font-semibold text-gray-600">
                          Serial No: {group.vehicle.serialNumber}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(group.totalAmount, group.totalPaid)}
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(group.totalAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Paid</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(group.totalPaid)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Dues</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(group.totalDues)}
                      </p>
                    </div>
                  </div>
                </div>

                {isVehicleExpanded && (
                  <div className="mt-6 space-y-3">
                    {group.payments.map((payment) => {
                      const isPaymentExpanded = expandedPayments.has(
                        payment._id,
                      );
                      return (
                        <div
                          key={payment._id}
                          className="bg-white rounded-lg shadow border border-gray-200 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePaymentExpand(payment._id)}
                              >
                                {isPaymentExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    Payment Record - {formatDate(payment.date)}
                                  </p>
                                  {getStatusBadge(
                                    payment.totalAmount,
                                    payment.paidAmount,
                                  )}
                                  {payment.paymentType === "EMI" && (
                                    <Badge variant="secondary">EMI</Badge>
                                  )}
                                  {payment.emi &&
                                    getEmiStatusBadge(payment.emi)}
                                </div>
                                {payment.remarks && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {payment.remarks}
                                  </p>
                                )}
                                {payment.emi && (
                                  <div className="flex items-center gap-1 text-xs text-red-500 font-semibold mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      Due by {formatDate(payment.emi.dueDate)}
                                      {payment.emi.status === "OVERDUE" &&
                                        ` — ${payment.emi.daysOverdue} day(s) overdue`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="text-sm font-semibold">
                                  {formatCurrency(payment.totalAmount)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Paid</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {formatCurrency(payment.paidAmount)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Dues</p>
                                <p className="text-sm font-semibold text-red-600">
                                  {formatCurrency(payment.dues)}
                                </p>
                              </div>
                              {payment.updatedBy && (
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">
                                    Updated By
                                  </p>
                                  <p className="text-sm font-semibold text-blue-600 capitalize">
                                    {payment.updatedBy?.username}
                                  </p>
                                </div>
                              )}

                              <div className="flex space-x-1">
                                {/* {payment.emi?.canExtend && ( */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenExtendEmiDialog(payment)
                                  }
                                  className="text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Extend EMI
                                </Button>
                                {/* )} */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenInstallmentDialog(payment)
                                  }
                                  className="text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Installment
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenPaymentDialog(payment)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeletePayment(payment._id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {isPaymentExpanded && (
                            <div className="mt-4 pl-8 space-y-4">
                              {payment.installments.length > 0 ? (
                                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                  <h4 className="text-sm font-semibold text-amber-900 mb-3">
                                    Payment History
                                  </h4>
                                  <table className="min-w-full">
                                    <thead>
                                      <tr className="border-b border-amber-200">
                                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-800">
                                          Date
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-800">
                                          Amount
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-800">
                                          Type
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-800">
                                          Remarks
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-800">
                                          Updated By
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-amber-800">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-100">
                                      {payment.installments.map(
                                        (installment) => (
                                          <tr
                                            key={installment._id}
                                            className="hover:bg-amber-100"
                                          >
                                            <td className="px-4 py-2 text-sm text-gray-900">
                                              {formatDate(installment.date)}
                                            </td>
                                            <td className="px-4 py-2 text-sm font-semibold text-green-600">
                                              {formatCurrency(
                                                installment.amount,
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                              {installment.installmentType ===
                                              "DOWN_PAYMENT" ? (
                                                <Badge variant="secondary">
                                                  Down Payment
                                                </Badge>
                                              ) : (
                                                <span className="text-gray-400 text-xs">
                                                  Regular
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                              {installment.remarks || "-"}
                                            </td>
                                            <td className="px-4 py-2 text-sm font-semibold capitalize text-gray-600">
                                              {installment.updatedBy?.username}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleOpenInstallmentDialog(
                                                    payment,
                                                    installment,
                                                  )
                                                }
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleDeleteInstallment(
                                                    installment._id,
                                                  )
                                                }
                                              >
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                              </Button>
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center border border-gray-200">
                                  No payment history yet. Click "Installment" to
                                  record a payment.
                                </div>
                              )}

                              {payment.emi &&
                                payment.emi.extensions.length > 0 && (
                                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                    <h4 className="text-sm font-semibold text-orange-900 mb-3">
                                      EMI Extension History
                                    </h4>
                                    <table className="min-w-full">
                                      <thead>
                                        <tr className="border-b border-orange-200">
                                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-800">
                                            Date
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-800">
                                            Interest %
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-800">
                                            Interest Amount
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-800">
                                            Months Added
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-800">
                                            New Due Date
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-orange-100">
                                        {payment.emi.extensions.map(
                                          (ext, idx) => (
                                            <tr key={idx}>
                                              <td className="px-4 py-2 text-sm text-gray-900">
                                                {formatDate(ext.date)}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                {ext.interestPercent}%
                                              </td>
                                              <td className="px-4 py-2 text-sm font-semibold text-orange-700">
                                                {formatCurrency(
                                                  ext.interestAmount,
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                {ext.monthsAdded}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                {formatDate(ext.newDueDate)}
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
            No vehicle payments found
          </div>
        )}
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? "Edit Payment" : "Add Payment"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vehicleId">Vehicle</Label>
                <SearchableSelect
                  options={searchedVehicles.map((vehicle) => ({
                    value: vehicle._id,
                    label: vehicle.number,
                    subtitle: vehicle.name,
                  }))}
                  value={paymentFormData.vehicleId}
                  onChange={(value) =>
                    setPaymentFormData({ ...paymentFormData, vehicleId: value })
                  }
                  onSearchChange={(search) => setVehicleSearchTerm(search)}
                  loading={isSearchingVehicles}
                  disabled={!!editingPayment}
                  placeholder="Select vehicle..."
                  searchPlaceholder="Search vehicles..."
                  emptyMessage="No vehicle found."
                />
                {editingPayment && (
                  <p className="text-xs text-gray-500 mt-1">
                    Vehicle cannot be changed when editing a payment
                  </p>
                )}
                {errors.vehicleId && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.vehicleId}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select
                  value={paymentFormData.paymentType}
                  onValueChange={(value) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      paymentType: value as "FULL" | "EMI",
                    })
                  }
                  disabled={!!editingPayment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Full Payment</SelectItem>
                    <SelectItem value="EMI">EMI</SelectItem>
                  </SelectContent>
                </Select>
                {editingPayment && (
                  <p className="text-xs text-gray-500 mt-1">
                    Payment type cannot be changed after creation
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="totalAmount">Total Amount (SAR)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={paymentFormData.totalAmount}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      totalAmount: e.target.value,
                    })
                  }
                />
                {errors.totalAmount && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.totalAmount}
                  </p>
                )}
              </div>

              {paymentFormData.paymentType === "EMI" && !editingPayment && (
                <>
                  <div>
                    <Label htmlFor="downPayment">Down Payment (SAR)</Label>
                    <Input
                      id="downPayment"
                      type="number"
                      step="0.01"
                      value={paymentFormData.downPayment}
                      onChange={(e) =>
                        setPaymentFormData({
                          ...paymentFormData,
                          downPayment: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                    {errors.downPayment && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.downPayment}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="emiPeriodMonths">EMI Period (Months)</Label>
                    <Input
                      id="emiPeriodMonths"
                      type="number"
                      min="1"
                      disabled
                      value={paymentFormData.emiPeriodMonths}
                      onChange={(e) =>
                        setPaymentFormData({
                          ...paymentFormData,
                          emiPeriodMonths: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Default is 6 months. After this period, the "Extend EMI"
                      option will appear if not fully paid.
                    </p>
                    {errors.emiPeriodMonths && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.emiPeriodMonths}
                      </p>
                    )}
                  </div>
                </>
              )}

              {editingPayment?.paymentType === "EMI" && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Down Payment:</strong>{" "}
                    {formatCurrency(editingPayment.downPayment || 0)}
                  </p>
                  {editingPayment.emi && (
                    <p>
                      <strong>EMI Due Date:</strong>{" "}
                      {formatDate(editingPayment.emi.dueDate)}
                    </p>
                  )}
                  <p className="italic">
                    EMI setup can't be edited here — use "Extend EMI" from the
                    payment row after the due date passes.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  value={paymentFormData.remarks}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClosePaymentDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? editingPayment
                    ? "Updating..."
                    : "Creating..."
                  : editingPayment
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Installment Dialog */}
      <Dialog
        open={isInstallmentDialogOpen}
        onOpenChange={setIsInstallmentDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInstallment ? "Edit Installment" : "Add Installment"}
            </DialogTitle>
            {selectedPayment && (
              <p className="text-sm text-gray-500">
                Payment:{" "}
                {selectedPayment.vehicleId
                  ? selectedPayment.vehicleId.number
                  : "Deleted Vehicle"}{" "}
                - {formatCurrency(selectedPayment.totalAmount)} | Paid:{" "}
                {formatCurrency(selectedPayment.paidAmount)} | Remaining:{" "}
                {formatCurrency(selectedPayment.dues)}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleInstallmentSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (SAR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={installmentFormData.amount}
                  onChange={(e) =>
                    setInstallmentFormData({
                      ...installmentFormData,
                      amount: e.target.value,
                    })
                  }
                />
                {errors.amount && (
                  <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="installmentDate">Date</Label>
                <Input
                  id="installmentDate"
                  type="date"
                  value={installmentFormData.date}
                  onChange={(e) =>
                    setInstallmentFormData({
                      ...installmentFormData,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="installmentRemarks">Remarks (Optional)</Label>
                <Input
                  id="installmentRemarks"
                  value={installmentFormData.remarks}
                  onChange={(e) =>
                    setInstallmentFormData({
                      ...installmentFormData,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseInstallmentDialog}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingInstallment ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Extend EMI Dialog */}
      <Dialog
        open={isExtendEmiDialogOpen}
        onOpenChange={setIsExtendEmiDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Extend EMI</DialogTitle>
            {extendingPayment && (
              <p className="text-sm text-gray-500">
                {extendingPayment.vehicleId
                  ? extendingPayment.vehicleId.number
                  : "Deleted Vehicle"}{" "}
                | Current Due: {formatCurrency(extendingPayment.dues)}
                {extendingPayment.emi &&
                  ` | Overdue by ${extendingPayment.emi.daysOverdue} day(s)`}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleExtendEmiSubmit}>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
                Interest will be calculated as a percentage of the current due
                amount and added to the total. The due date will move forward by
                the number of months you choose.
              </div>
              <div>
                <Label htmlFor="interestPercent">Interest (%)</Label>
                <Input
                  id="interestPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  value={extendFormData.interestPercent}
                  onChange={(e) =>
                    setExtendFormData({
                      ...extendFormData,
                      interestPercent: e.target.value,
                    })
                  }
                  placeholder="e.g. 2 for 2%"
                />
                {extendingPayment &&
                  extendFormData.interestPercent &&
                  !isNaN(parseFloat(extendFormData.interestPercent)) &&
                  (() => {
                    const emiPrincipal =
                      (extendingPayment.originalAmount ??
                        extendingPayment.totalAmount) -
                      (extendingPayment.downPayment || 0);

                    const interestAmount =
                      (emiPrincipal *
                        parseFloat(extendFormData.interestPercent)) /
                      100;

                    return (
                      <p className="text-xs text-gray-500 mt-2">
                        EMI Principal: {formatCurrency(emiPrincipal)}
                        <br />
                        Interest amount: {formatCurrency(interestAmount)}
                        <br />
                        New Total:{" "}
                        {formatCurrency(
                          extendingPayment.totalAmount + interestAmount,
                        )}
                      </p>
                    );
                  })()}
                {errors.interestPercent && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.interestPercent}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="additionalMonths">Extend By (Months)</Label>
                <Input
                  id="additionalMonths"
                  type="number"
                  min="1"
                  value={extendFormData.additionalMonths}
                  onChange={(e) =>
                    setExtendFormData({
                      ...extendFormData,
                      additionalMonths: e.target.value,
                    })
                  }
                />
                {errors.additionalMonths && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.additionalMonths}
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
                onClick={handleCloseExtendEmiDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Extending..." : "Extend EMI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) =>
          setDeleteConfirmation({ open, type: null, id: null })
        }
        onConfirm={
          deleteConfirmation.type === "payment"
            ? confirmDeletePayment
            : confirmDeleteInstallment
        }
        title={
          deleteConfirmation.type === "payment"
            ? "Delete Payment"
            : "Delete Installment"
        }
        description={
          deleteConfirmation.type === "payment"
            ? "Are you sure you want to delete this payment? All installments will also be deleted. This action cannot be undone."
            : "Are you sure you want to delete this installment? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Calendar, Users, UserCheck, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import { useYearFilter } from "@/contexts/YearFilterContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Installment {
  _id: string;
  billId?: string;
  amount: number;
  date: string;
  remarks?: string;
}

interface Bill {
  _id: string;
  type: "income" | "expense";
  name: string;
  totalAmount: number;
  paidAmount: number; // Calculated from installments
  date: string;
  employeeId?: { _id: string; name: string; type: string };
  installments?: Installment[];
}

interface Employee {
  _id: string;
  name: string;
  type: string;
}

export default function BillsPage() {
  const { selectedYear } = useYearFilter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "agents">("all");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    name: "",
    totalAmount: "",
    date: new Date().toISOString().split("T")[0],
    employeeId: "none",
  });

  const [selectedBillForInstallments, setSelectedBillForInstallments] = useState<Bill | null>(null);
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [installmentFormData, setInstallmentFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [installmentErrors, setInstallmentErrors] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());

  // Initial load
  useEffect(() => {
    fetchBills();
    fetchEmployees();
  }, []);

  // Debounced search and filter effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBills();
    }, 500); // 500ms delay after user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filterType, filterAgent, startDate, endDate, viewMode, selectedYear]);

  async function fetchBills() {
    try {
      // Only show searching spinner if there are filters applied
      if (searchTerm || filterType !== "all" || filterAgent !== "all" || startDate || endDate) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      // Build query parameters
      const params = new URLSearchParams();

      // Add agentWise filter when in agents view mode
      if (viewMode === "agents") {
        params.append("agentWise", "true");
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      if (filterType !== "all") {
        params.append("type", filterType);
      }

      // Add specific employee filter
      if (filterAgent !== "all") {
        params.append("employeeId", filterAgent);
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      params.append("year", selectedYear.toString());

      const queryString = params.toString();
      const url = `${API_URL}/api/bills${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setBills(data.data);
      } else {
        toast.error("Failed to fetch bills");
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast.error("Error fetching bills");
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
        // Filter to only show agents
        setEmployees(data.data.filter((emp: any) => emp.type === "agent"));
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Transaction name is required";
    }

    const totalAmount = parseFloat(formData.totalAmount);

    if (isNaN(totalAmount) || totalAmount < 0) {
      newErrors.totalAmount = "Total amount must be a positive number";
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

    if (selectedBillForInstallments) {
      const remainingAmount = selectedBillForInstallments.totalAmount - selectedBillForInstallments.paidAmount;
      if (amount > remainingAmount) {
        newErrors.amount = `Amount cannot exceed remaining amount (${formatCurrency(remainingAmount)})`;
      }
    }

    setInstallmentErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const url = editingBill ? `/api/bills/${editingBill._id}` : "/api/bills";
      const method = editingBill ? "PUT" : "POST";

      const res = await fetch(`${API_URL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: formData.type,
          name: formData.name,
          totalAmount: parseFloat(formData.totalAmount),
          date: new Date(formData.date),
          employeeId: formData.employeeId === "none" ? null : formData.employeeId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingBill
            ? "Transaction updated successfully"
            : "Transaction created successfully"
        );
        fetchBills();
        handleCloseDialog();
      } else {
        toast.error(data.error || "Failed to save transaction");
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving bill:", error);
      setErrors({ submit: "An error occurred" });
      toast.error("An error occurred while saving transaction");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    setDeleteConfirmation({ open: true, id });
  }

  async function confirmDelete() {
    if (!deleteConfirmation.id) return;

    try {
      const res = await fetch(`${API_URL}/api/bills/${deleteConfirmation.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Transaction deleted successfully");
        fetchBills();
      } else {
        toast.error(data.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("An error occurred while deleting transaction");
    } finally {
      setDeleteConfirmation({ open: false, id: null });
    }
  }

  function handleOpenDialog(bill?: Bill) {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        type: bill.type,
        name: bill.name,
        totalAmount: bill.totalAmount.toString(),
        date: new Date(bill.date).toISOString().split("T")[0],
        employeeId: bill.employeeId?._id || "none",
      });
    } else {
      setEditingBill(null);
      setFormData({
        type: "income",
        name: "",
        totalAmount: "",
        date: new Date().toISOString().split("T")[0],
        employeeId: "none",
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleOpenInstallmentDialog(bill: Bill) {
    setSelectedBillForInstallments(bill);
    setInstallmentFormData({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setInstallmentErrors({});
    setIsInstallmentDialogOpen(true);
  }

  function handleCloseInstallmentDialog() {
    setIsInstallmentDialogOpen(false);
    setSelectedBillForInstallments(null);
    setInstallmentErrors({});
  }

  async function handleInstallmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateInstallmentForm() || !selectedBillForInstallments) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/api/installments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          billId: selectedBillForInstallments._id,
          amount: parseFloat(installmentFormData.amount),
          date: new Date(installmentFormData.date),
          remarks: installmentFormData.remarks || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Installment added successfully");
        fetchBills();
        handleCloseInstallmentDialog();
      } else {
        toast.error(data.error || "Failed to add installment");
        setInstallmentErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error adding installment:", error);
      toast.error("An error occurred while adding installment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteInstallment(installmentId: string) {
    try {
      const res = await fetch(`${API_URL}/api/installments/${installmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Installment deleted successfully");
        fetchBills();
      } else {
        toast.error(data.error || "Failed to delete installment");
      }
    } catch (error) {
      console.error("Error deleting installment:", error);
      toast.error("An error occurred while deleting installment");
    }
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingBill(null);
    setErrors({});
  }

  function getStatusBadge(totalAmount: number, paidAmount: number) {
    const status = getPaymentStatus(totalAmount, paidAmount);
    const variant =
      status === "paid" ? "success" : status === "partial" ? "warning" : "danger";
    return <Badge variant={variant}>{status}</Badge>;
  }

  function toggleBillExpansion(billId: string) {
    setExpandedBills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  }

  // Calculate totals from bills
  const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalPaid = bills.reduce((sum, bill) => sum + bill.paidAmount, 0);
  const totalDues = totalAmount - totalPaid;

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Income & Expense</h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === "agents" ? "Agent transactions only" : "All transactions"}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "agents" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("agents")}
              className="rounded-none border-0"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Agents Only
            </Button>
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("all")}
              className="rounded-none border-0"
            >
              <Users className="mr-2 h-4 w-4" />
              All Bills
            </Button>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDues)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
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
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp._id} value={emp._id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-sm text-gray-600 mb-1">
              Start Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="endDate" className="text-sm text-gray-600 mb-1">
              End Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || filterType !== "all" || filterAgent !== "all" || startDate || endDate) && (
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-gray-500 font-medium">Active Filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchTerm}
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Type: {filterType}
              </Badge>
            )}
            {filterAgent !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Agent: {employees.find(e => e._id === filterAgent)?.name || "Unknown"}
              </Badge>
            )}
            {startDate && (
              <Badge variant="secondary" className="gap-1">
                From: {new Date(startDate).toLocaleDateString()}
              </Badge>
            )}
            {endDate && (
              <Badge variant="secondary" className="gap-1">
                To: {new Date(endDate).toLocaleDateString()}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setFilterAgent("all");
                setStartDate("");
                setEndDate("");
              }}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">

              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Transaction Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Agent
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Paid
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Dues
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bills.map((bill) => {
              const isExpanded = expandedBills.has(bill._id);
              const hasInstallments = bill.installments && bill.installments.length > 0;

              return (
                <>
                  <tr key={bill._id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {hasInstallments && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBillExpansion(bill._id)}
                          className="p-0 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={bill.type === "income" ? "default" : "secondary"}>
                        {bill.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(bill.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bill.employeeId?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(bill.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                      {formatCurrency(bill.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-semibold">
                      {formatCurrency(bill.totalAmount - bill.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {getStatusBadge(bill.totalAmount, bill.paidAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenInstallmentDialog(bill)}
                        title="Add Payment"
                      >
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(bill)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bill._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>

                  {/* Expandable Installments Section */}
                  {isExpanded && hasInstallments && (
                    <tr key={`${bill._id}-installments`}>
                      <td colSpan={10} className="px-6 py-4 bg-gray-50">
                        <div className="pl-8">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h4>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Amount</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Remarks</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {bill.installments?.map((installment) => (
                                  <tr key={installment._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm text-gray-700">
                                      {formatDate(installment.date)}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-semibold text-green-600">
                                      {formatCurrency(installment.amount)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-500">
                                      {installment.remarks || "-"}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteInstallment(installment._id)}
                                        title="Delete Payment"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {bills.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || filterType !== "all" || startDate || endDate
              ? "No transactions found matching your filters"
              : viewMode === "agents"
              ? "No agent transactions found"
              : "No transactions found"}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBill ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Transaction Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Office rent, Client payment"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="totalAmount">Total Amount (SAR)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, totalAmount: e.target.value })
                  }
                />
                {errors.totalAmount && (
                  <p className="text-sm text-red-500 mt-1">{errors.totalAmount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="employeeId">Agent (Optional)</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? (editingBill ? "Updating..." : "Creating...")
                  : (editingBill ? "Update" : "Create")
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => setDeleteConfirmation({ open, id: null })}
        onConfirm={confirmDelete}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Installment Dialog */}
      <Dialog open={isInstallmentDialogOpen} onOpenChange={setIsInstallmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Payment for {selectedBillForInstallments?.name}</DialogTitle>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(selectedBillForInstallments?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <span className="font-semibold text-green-600">{formatCurrency(selectedBillForInstallments?.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span>Remaining:</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency((selectedBillForInstallments?.totalAmount || 0) - (selectedBillForInstallments?.paidAmount || 0))}
                </span>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleInstallmentSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="installmentAmount">Amount (SAR)</Label>
                <Input
                  id="installmentAmount"
                  type="number"
                  step="0.01"
                  value={installmentFormData.amount}
                  onChange={(e) =>
                    setInstallmentFormData({ ...installmentFormData, amount: e.target.value })
                  }
                  placeholder="Enter payment amount"
                />
                {installmentErrors.amount && (
                  <p className="text-sm text-red-500 mt-1">{installmentErrors.amount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="installmentDate">Date</Label>
                <Input
                  id="installmentDate"
                  type="date"
                  value={installmentFormData.date}
                  onChange={(e) =>
                    setInstallmentFormData({ ...installmentFormData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="installmentRemarks">Remarks (Optional)</Label>
                <Input
                  id="installmentRemarks"
                  value={installmentFormData.remarks}
                  onChange={(e) =>
                    setInstallmentFormData({ ...installmentFormData, remarks: e.target.value })
                  }
                  placeholder="Add any notes about this payment"
                />
              </div>
              {installmentErrors.submit && (
                <p className="text-sm text-red-500">{installmentErrors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseInstallmentDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

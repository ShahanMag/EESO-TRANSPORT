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
import { Plus, Search, Edit, Trash2, Calendar, Users, UserCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import { useYearFilter } from "@/contexts/YearFilterContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Bill {
  _id: string;
  type: "income" | "expense";
  name: string;
  totalAmount: number;
  paidAmount: number;
  date: string;
  employeeId?: { _id: string; name: string; type: string };
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    name: "",
    totalAmount: "",
    paidAmount: "",
    date: new Date().toISOString().split("T")[0],
    employeeId: "none",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });

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
    const paidAmount = parseFloat(formData.paidAmount);

    if (isNaN(totalAmount) || totalAmount < 0) {
      newErrors.totalAmount = "Total amount must be a positive number";
    }

    if (isNaN(paidAmount) || paidAmount < 0) {
      newErrors.paidAmount = "Paid amount must be a positive number";
    }

    if (paidAmount > totalAmount) {
      newErrors.paidAmount = "Paid amount cannot exceed total amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
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
          paidAmount: parseFloat(formData.paidAmount),
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
        paidAmount: bill.paidAmount.toString(),
        date: new Date(bill.date).toISOString().split("T")[0],
        employeeId: bill.employeeId?._id || "none",
      });
    } else {
      setEditingBill(null);
      setFormData({
        type: "income",
        name: "",
        totalAmount: "",
        paidAmount: "",
        date: new Date().toISOString().split("T")[0],
        employeeId: "none",
      });
    }
    setErrors({});
    setIsDialogOpen(true);
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
            {bills.map((bill) => (
              <tr key={bill._id} className="hover:bg-gray-50">
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
            ))}
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
                <Label htmlFor="paidAmount">Paid Amount (SAR)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  value={formData.paidAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, paidAmount: e.target.value })
                  }
                />
                {errors.paidAmount && (
                  <p className="text-sm text-red-500 mt-1">{errors.paidAmount}</p>
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
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingBill ? "Update" : "Create"}</Button>
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
    </div>
  );
}

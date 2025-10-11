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
import { Plus, Search, Edit, Trash2, ChevronDown, ChevronRight, Car } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";

interface Installment {
  _id: string;
  paymentId: string;
  amount: number;
  date: string;
  remarks?: string;
}

interface Payment {
  _id: string;
  vehicleId: { _id: string; number: string; name: string } | null;
  totalAmount: number;
  date: string;
  remarks?: string;
}

interface PaymentWithInstallments extends Payment {
  installments: Installment[];
  paidAmount: number;
  dues: number;
}

interface Vehicle {
  _id: string;
  number: string;
  name: string;
}

interface VehiclePaymentGroup {
  vehicle: Vehicle;
  payments: PaymentWithInstallments[];
  totalAmount: number;
  totalPaid: number;
  totalDues: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithInstallments[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleGroups, setVehicleGroups] = useState<VehiclePaymentGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<VehiclePaymentGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithInstallments | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());

  const [paymentFormData, setPaymentFormData] = useState({
    vehicleId: "",
    totalAmount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const [installmentFormData, setInstallmentFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPayments();
    fetchVehicles();
  }, []);

  useEffect(() => {
    // Group payments by vehicle
    const groups: Map<string, VehiclePaymentGroup> = new Map();

    vehicles.forEach((vehicle) => {
      const vehiclePayments = payments.filter(
        (p) => p.vehicleId && p.vehicleId._id === vehicle._id
      );

      if (vehiclePayments.length > 0) {
        const totalAmount = vehiclePayments.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalPaid = vehiclePayments.reduce((sum, p) => sum + p.paidAmount, 0);
        const totalDues = totalAmount - totalPaid;

        groups.set(vehicle._id, {
          vehicle,
          payments: vehiclePayments,
          totalAmount,
          totalPaid,
          totalDues,
        });
      }
    });

    const groupsArray = Array.from(groups.values());
    setVehicleGroups(groupsArray);

    // Apply search filter
    const filtered = groupsArray.filter((group) =>
      group.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.vehicle.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [payments, vehicles, searchTerm]);

  async function fetchPayments() {
    try {
      // Fetch payments and all installments in parallel
      const [paymentsRes, installmentsRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/installments"),
      ]);

      const [paymentsData, allInstallmentsData] = await Promise.all([
        paymentsRes.json(),
        installmentsRes.json(),
      ]);

      if (paymentsData.success) {
        // Group installments by paymentId for faster lookup
        const installmentsByPaymentId: Record<string, Installment[]> = {};
        if (allInstallmentsData.success) {
          allInstallmentsData.data.forEach((inst: Installment) => {
            if (!installmentsByPaymentId[inst.paymentId]) {
              installmentsByPaymentId[inst.paymentId] = [];
            }
            installmentsByPaymentId[inst.paymentId].push(inst);
          });
        }

        // Map payments with their installments
        const paymentsWithInstallments = paymentsData.data.map((payment: Payment) => {
          const installments = installmentsByPaymentId[payment._id] || [];
          const paidAmount = installments.reduce((sum: number, inst: Installment) => sum + inst.amount, 0);
          return {
            ...payment,
            installments,
            paidAmount,
            dues: payment.totalAmount - paidAmount,
          };
        });

        setPayments(paymentsWithInstallments);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
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

  function validatePaymentForm() {
    const newErrors: Record<string, string> = {};

    if (!paymentFormData.vehicleId) {
      newErrors.vehicleId = "Vehicle is required";
    }

    const totalAmount = parseFloat(paymentFormData.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
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

    if (selectedPayment && !editingInstallment) {
      const totalInstallments = selectedPayment.paidAmount + amount;
      if (totalInstallments > selectedPayment.totalAmount) {
        newErrors.amount = `Total installments (${formatCurrency(totalInstallments)}) cannot exceed total amount (${formatCurrency(selectedPayment.totalAmount)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePaymentForm()) return;

    try {
      const url = editingPayment
        ? `/api/payments/${editingPayment._id}`
        : "/api/payments";
      const method = editingPayment ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: paymentFormData.vehicleId,
          totalAmount: parseFloat(paymentFormData.totalAmount),
          date: new Date(paymentFormData.date),
          remarks: paymentFormData.remarks,
        }),
      });

      const data = await res.json();

      if (data.success) {
        fetchPayments();
        handleClosePaymentDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      setErrors({ submit: "An error occurred" });
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

      const res = await fetch(url, {
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
        fetchPayments();
        handleCloseInstallmentDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving installment:", error);
      setErrors({ submit: "An error occurred" });
    }
  }

  async function handleDeletePayment(id: string) {
    if (!confirm("Are you sure you want to delete this payment? All installments will also be deleted.")) return;

    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        fetchPayments();
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  }

  async function handleDeleteInstallment(id: string) {
    if (!confirm("Are you sure you want to delete this installment?")) return;

    try {
      const res = await fetch(`/api/installments/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        fetchPayments();
      }
    } catch (error) {
      console.error("Error deleting installment:", error);
    }
  }

  function handleOpenPaymentDialog(payment?: Payment) {
    if (payment) {
      setEditingPayment(payment);
      setPaymentFormData({
        vehicleId: payment.vehicleId ? payment.vehicleId._id : "",
        totalAmount: payment.totalAmount.toString(),
        date: new Date(payment.date).toISOString().split("T")[0],
        remarks: payment.remarks || "",
      });
    } else {
      setEditingPayment(null);
      setPaymentFormData({
        vehicleId: "",
        totalAmount: "",
        date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
    }
    setErrors({});
    setIsPaymentDialogOpen(true);
  }

  function handleClosePaymentDialog() {
    setIsPaymentDialogOpen(false);
    setEditingPayment(null);
    setErrors({});
  }

  function handleOpenInstallmentDialog(payment: PaymentWithInstallments, installment?: Installment) {
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

  function toggleVehicleExpand(vehicleId: string) {
    setExpandedVehicles(prev => {
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
    setExpandedPayments(prev => {
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

  // Calculate overall totals
  const totalAmount = filteredGroups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalPaid = filteredGroups.reduce((sum, g) => sum + g.totalPaid, 0);
  const totalDues = totalAmount - totalPaid;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vehicle Payments</h1>
        <Button onClick={() => handleOpenPaymentDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Total Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(totalDues)}
            </div>
          </CardContent>
        </Card>
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

      <div className="space-y-4">
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
                        <p className="text-sm text-blue-700">{group.vehicle.name}</p>
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
                      const isPaymentExpanded = expandedPayments.has(payment._id);
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
                                <div className="flex items-center space-x-3">
                                  <p className="text-sm font-semibold text-gray-900">
                                    Payment Record - {formatDate(payment.date)}
                                  </p>
                                  {getStatusBadge(payment.totalAmount, payment.paidAmount)}
                                </div>
                                {payment.remarks && (
                                  <p className="text-xs text-gray-500 mt-1">{payment.remarks}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="text-sm font-semibold">{formatCurrency(payment.totalAmount)}</p>
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
                              <div className="flex space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenInstallmentDialog(payment)}
                                  className="text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Installment
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPaymentDialog(payment)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePayment(payment._id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {isPaymentExpanded && (
                            <div className="mt-4 pl-8">
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
                                          Remarks
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-amber-800">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-100">
                                      {payment.installments.map((installment) => (
                                        <tr key={installment._id} className="hover:bg-amber-100">
                                          <td className="px-4 py-2 text-sm text-gray-900">
                                            {formatDate(installment.date)}
                                          </td>
                                          <td className="px-4 py-2 text-sm font-semibold text-green-600">
                                            {formatCurrency(installment.amount)}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600">
                                            {installment.remarks || "-"}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleOpenInstallmentDialog(payment, installment)}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDeleteInstallment(installment._id)}
                                            >
                                              <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center border border-gray-200">
                                  No payment history yet. Click "Add Installment" to record a payment.
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
                  options={vehicles.map((vehicle) => ({
                    value: vehicle._id,
                    label: vehicle.number,
                    subtitle: vehicle.name,
                  }))}
                  value={paymentFormData.vehicleId}
                  onChange={(value) =>
                    setPaymentFormData({ ...paymentFormData, vehicleId: value })
                  }
                  placeholder="Select vehicle..."
                  searchPlaceholder="Search vehicles..."
                  emptyMessage="No vehicle found."
                />
                {errors.vehicleId && (
                  <p className="text-sm text-red-500 mt-1">{errors.vehicleId}</p>
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
                    setPaymentFormData({ ...paymentFormData, totalAmount: e.target.value })
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
                  value={paymentFormData.date}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  value={paymentFormData.remarks}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, remarks: e.target.value })
                  }
                />
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleClosePaymentDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPayment ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Installment Dialog */}
      <Dialog open={isInstallmentDialogOpen} onOpenChange={setIsInstallmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInstallment ? "Edit Installment" : "Add Installment"}
            </DialogTitle>
            {selectedPayment && (
              <p className="text-sm text-gray-500">
                Payment: {selectedPayment.vehicleId ? selectedPayment.vehicleId.number : "Deleted Vehicle"} - {formatCurrency(selectedPayment.totalAmount)} |
                Paid: {formatCurrency(selectedPayment.paidAmount)} |
                Remaining: {formatCurrency(selectedPayment.dues)}
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
                    setInstallmentFormData({ ...installmentFormData, amount: e.target.value })
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
                />
              </div>
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseInstallmentDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingInstallment ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

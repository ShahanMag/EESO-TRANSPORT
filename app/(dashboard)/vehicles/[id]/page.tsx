"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import { toast } from "sonner";

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
  employeeId?: { _id: string; name: string; type: string };
}

interface Installment {
  _id: string;
  amount: number;
  date: string;
  remarks?: string;
}

interface Payment {
  _id: string;
  vehicleId: string;
  totalAmount: number;
  date: string;
  remarks?: string;
  installments?: Installment[];
  paidAmount?: number;
  dues?: number;
}

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [isDeletePaymentDialogOpen, setIsDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    totalAmount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [installmentFormData, setInstallmentFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [terminateFormData, setTerminateFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicleAmount: "",
    paidAmount: "",
    amountToBePaid: "",
    description: "",
  });

  useEffect(() => {
    fetchVehicleDetails();
    fetchPayments();
  }, [vehicleId]);

  async function fetchVehicleDetails() {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`);
      const data = await res.json();
      if (data.success) {
        setVehicle(data.data);
      } else {
        toast.error("Failed to fetch vehicle details");
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      toast.error("Error fetching vehicle details");
    } finally {
      setLoading(false);
    }
  }

  async function fetchPayments() {
    try {
      const res = await fetch(`/api/payments?vehicleId=${vehicleId}`);
      const data = await res.json();
      if (data.success) {
        // Fetch installments for each payment
        const paymentsWithInstallments = await Promise.all(
          data.data.map(async (payment: Payment) => {
            const instRes = await fetch(`/api/installments?paymentId=${payment._id}`);
            const instData = await instRes.json();
            const installments = instData.success ? instData.data : [];
            const paidAmount = installments.reduce(
              (sum: number, inst: Installment) => sum + inst.amount,
              0
            );
            return {
              ...payment,
              installments,
              paidAmount,
              dues: payment.totalAmount - paidAmount,
            };
          })
        );
        setPayments(paymentsWithInstallments);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleId,
          totalAmount: parseFloat(paymentFormData.totalAmount),
          date: new Date(paymentFormData.date),
          remarks: paymentFormData.remarks || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Payment record created successfully");
        fetchPayments();
        setIsPaymentDialogOpen(false);
        setPaymentFormData({
          totalAmount: "",
          date: new Date().toISOString().split("T")[0],
          remarks: "",
        });
      } else {
        toast.error(data.error || "Failed to create payment");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("An error occurred");
    }
  }

  async function handleInstallmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPayment._id,
          amount: parseFloat(installmentFormData.amount),
          date: new Date(installmentFormData.date),
          remarks: installmentFormData.remarks || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Installment added successfully");
        fetchPayments();
        setIsInstallmentDialogOpen(false);
        setSelectedPayment(null);
        setInstallmentFormData({
          amount: "",
          date: new Date().toISOString().split("T")[0],
          remarks: "",
        });
      } else {
        toast.error(data.error || "Failed to add installment");
      }
    } catch (error) {
      console.error("Error adding installment:", error);
      toast.error("An error occurred");
    }
  }

  function openInstallmentDialog(payment: Payment) {
    setSelectedPayment(payment);
    setIsInstallmentDialogOpen(true);
  }

  async function handleTerminateContract(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Here you would typically call an API to terminate the contract
      // For now, we'll just show a success message and navigate back
      toast.success("Vehicle contract terminated successfully");
      router.push("/vehicles");
    } catch (error) {
      console.error("Error terminating contract:", error);
      toast.error("An error occurred");
    }
  }

  function openTerminateDialog() {
    setTerminateFormData({
      date: new Date().toISOString().split("T")[0],
      vehicleAmount: vehicle?.vehicleAmount?.toString() || "",
      paidAmount: totalPaid.toString(),
      amountToBePaid: totalDues.toString(),
      description: "",
    });
    setIsTerminateDialogOpen(true);
  }

  function handleDeletePaymentClick(paymentId: string) {
    setDeletingPaymentId(paymentId);
    setIsDeletePaymentDialogOpen(true);
  }

  async function handleDeletePaymentConfirm() {
    if (!deletingPaymentId) return;

    try {
      const res = await fetch(`/api/payments/${deletingPaymentId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Payment record deleted successfully");
        fetchPayments();
      } else {
        toast.error(data.error || "Failed to delete payment");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("An error occurred while deleting payment");
    } finally {
      setIsDeletePaymentDialogOpen(false);
      setDeletingPaymentId(null);
    }
  }

  // Calculate summary
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalDues = totalPaymentAmount - totalPaid;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Vehicle not found</p>
          <Button onClick={() => router.push("/vehicles")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/vehicles")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{vehicle.number}</h1>
            <p className="text-gray-600">{vehicle.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={openTerminateDialog}
          >
            Terminate Contract
          </Button>
          <Button onClick={() => setIsPaymentDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Record
          </Button>
        </div>
      </div>

      {/* Vehicle Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Serial Number</p>
              <p className="font-semibold">{vehicle.serialNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <Badge variant={vehicle.type === "private" ? "default" : "secondary"}>
                {vehicle.type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Model</p>
              <p className="font-semibold">{vehicle.model || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vehicle Amount</p>
              <p className="font-semibold">
                {vehicle.vehicleAmount
                  ? formatCurrency(vehicle.vehicleAmount)
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold">
                {vehicle.startDate ? formatDate(vehicle.startDate) : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contract Expiry</p>
              <p className="font-semibold">
                {vehicle.contractExpiry ? formatDate(vehicle.contractExpiry) : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Employee</p>
              <p className="font-semibold">
                {vehicle.employeeId?.name || "Unassigned"}
              </p>
            </div>
            {vehicle.description && (
              <div className="md:col-span-4">
                <p className="text-sm text-gray-600">Description</p>
                <p className="font-semibold">{vehicle.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Payment Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(totalPaymentAmount)}
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
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
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(totalPaid)}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Outstanding Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(totalDues)}
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Payment Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-purple-900">
                {payments.length}
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Records */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No payment records found
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {formatCurrency(payment.totalAmount)}
                        </h3>
                        <Badge
                          variant={
                            getPaymentStatus(payment.totalAmount, payment.paidAmount || 0) ===
                            "paid"
                              ? "success"
                              : getPaymentStatus(
                                  payment.totalAmount,
                                  payment.paidAmount || 0
                                ) === "partial"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {getPaymentStatus(payment.totalAmount, payment.paidAmount || 0)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Date: {formatDate(payment.date)}
                      </p>
                      {payment.remarks && (
                        <p className="text-sm text-gray-500 mt-1 italic">
                          {payment.remarks}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePaymentClick(payment._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openInstallmentDialog(payment)}
                        disabled={
                          (payment.paidAmount || 0) >= payment.totalAmount
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Installment
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-md mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payment.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Paid</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(payment.paidAmount || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Due</p>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(payment.dues || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Installments */}
                  {payment.installments && payment.installments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Installments:</p>
                      {payment.installments.map((inst) => (
                        <div
                          key={inst._id}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div>
                            <p className="font-semibold text-sm">
                              {formatCurrency(inst.amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(inst.date)}
                            </p>
                          </div>
                          {inst.remarks && (
                            <p className="text-xs text-gray-500 italic">
                              {inst.remarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="totalAmount">
                  Total Amount (SAR) <span className="text-red-500">*</span>
                </Label>
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="paymentDate">Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="paymentRemarks">Remarks</Label>
                <Input
                  id="paymentRemarks"
                  value={paymentFormData.remarks}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      remarks: e.target.value,
                    })
                  }
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Installment Dialog */}
      <Dialog
        open={isInstallmentDialogOpen}
        onOpenChange={setIsInstallmentDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Installment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInstallmentSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="installmentAmount">
                  Amount (SAR) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="installmentAmount"
                  type="number"
                  step="0.01"
                  value={installmentFormData.amount}
                  onChange={(e) =>
                    setInstallmentFormData({
                      ...installmentFormData,
                      amount: e.target.value,
                    })
                  }
                  required
                />
                {selectedPayment && (
                  <p className="text-xs text-gray-600 mt-1">
                    Remaining:{" "}
                    {formatCurrency(selectedPayment.dues || 0)}
                  </p>
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
                <Label htmlFor="installmentRemarks">Remarks</Label>
                <Input
                  id="installmentRemarks"
                  value={installmentFormData.remarks}
                  onChange={(e) =>
                    setInstallmentFormData({
                      ...installmentFormData,
                      remarks: e.target.value,
                    })
                  }
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInstallmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Installment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terminate Contract Dialog */}
      <Dialog
        open={isTerminateDialogOpen}
        onOpenChange={setIsTerminateDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terminate Vehicle Contract</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTerminateContract}>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action will terminate the contract for vehicle {vehicle?.number}. Please fill in the details below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="terminateDate">
                    Termination Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="terminateDate"
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
                  <Label htmlFor="vehicleAmountTerminate">Vehicle Amount (SAR)</Label>
                  <Input
                    id="vehicleAmountTerminate"
                    type="number"
                    step="0.01"
                    value={terminateFormData.vehicleAmount}
                    onChange={(e) =>
                      setTerminateFormData({
                        ...terminateFormData,
                        vehicleAmount: e.target.value,
                      })
                    }
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="paidAmountTerminate">Paid Amount (SAR)</Label>
                  <Input
                    id="paidAmountTerminate"
                    type="number"
                    step="0.01"
                    value={terminateFormData.paidAmount}
                    onChange={(e) =>
                      setTerminateFormData({
                        ...terminateFormData,
                        paidAmount: e.target.value,
                      })
                    }
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="amountToBePaidTerminate">
                    Amount to be Paid (SAR)
                  </Label>
                  <Input
                    id="amountToBePaidTerminate"
                    type="number"
                    step="0.01"
                    value={terminateFormData.amountToBePaid}
                    onChange={(e) =>
                      setTerminateFormData({
                        ...terminateFormData,
                        amountToBePaid: e.target.value,
                      })
                    }
                    readOnly
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="terminateDescription">
                  Reason for Termination <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="terminateDescription"
                  value={terminateFormData.description}
                  onChange={(e) =>
                    setTerminateFormData({
                      ...terminateFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Please provide a reason for terminating the contract"
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
                Terminate Contract
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation Dialog */}
      <ConfirmDialog
        open={isDeletePaymentDialogOpen}
        onOpenChange={setIsDeletePaymentDialogOpen}
        onConfirm={handleDeletePaymentConfirm}
        title="Delete Payment Record"
        description="Are you sure you want to delete this payment record? This will also delete all associated installments. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

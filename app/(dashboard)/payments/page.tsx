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
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";

interface Payment {
  _id: string;
  vehicleId: { _id: string; number: string; name: string };
  totalAmount: number;
  paidAmount: number;
  date: string;
  remarks?: string;
}

interface Vehicle {
  _id: string;
  number: string;
  name: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    vehicleId: "",
    totalAmount: "",
    paidAmount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPayments();
    fetchVehicles();
  }, []);

  useEffect(() => {
    const filtered = payments.filter((p) =>
      p.vehicleId.number.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPayments(filtered);
  }, [searchTerm, payments]);

  async function fetchPayments() {
    try {
      const res = await fetch("/api/payments");
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
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

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = "Vehicle is required";
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
      const url = editingPayment
        ? `/api/payments/${editingPayment._id}`
        : "/api/payments";
      const method = editingPayment ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          totalAmount: parseFloat(formData.totalAmount),
          paidAmount: parseFloat(formData.paidAmount),
          date: new Date(formData.date),
          remarks: formData.remarks,
        }),
      });

      const data = await res.json();

      if (data.success) {
        fetchPayments();
        handleCloseDialog();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      setErrors({ submit: "An error occurred" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this payment?")) return;

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

  function handleOpenDialog(payment?: Payment) {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        vehicleId: payment.vehicleId._id,
        totalAmount: payment.totalAmount.toString(),
        paidAmount: payment.paidAmount.toString(),
        date: new Date(payment.date).toISOString().split("T")[0],
        remarks: payment.remarks || "",
      });
    } else {
      setEditingPayment(null);
      setFormData({
        vehicleId: "",
        totalAmount: "",
        paidAmount: "",
        date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
    }
    setErrors({});
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingPayment(null);
    setErrors({});
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by vehicle number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Paid Amount
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
            {filteredPayments.map((payment) => (
              <tr key={payment._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {payment.vehicleId.number} - {payment.vehicleId.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(payment.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(payment.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(payment.paidAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(payment.totalAmount - payment.paidAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {getStatusBadge(payment.totalAmount, payment.paidAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(payment)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(payment._id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payments found
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? "Edit Payment" : "Add Payment"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vehicleId">Vehicle</Label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicleId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.number} - {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {formData.totalAmount && formData.paidAmount && (
                  <p className="text-sm text-gray-600 mt-1">
                    Dues: {formatCurrency(parseFloat(formData.totalAmount) - parseFloat(formData.paidAmount))}
                  </p>
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
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
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
                {editingPayment ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

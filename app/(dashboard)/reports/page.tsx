"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel-utils";
import { Download } from "lucide-react";
import { apiRequest } from "@/lib/api-config";
import { toast } from "sonner";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";

interface Vehicle {
  _id: string;
  number: string;
  name: string;
}

interface Employee {
  _id: string;
  name: string;
  iqamaId: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("employees");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [filters, setFilters] = useState({
    vehicleId: "",
    employeeId: "",
    billType: "",
    paymentStatus: "",
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [isSearchingVehicles, setIsSearchingVehicles] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchEmployees();
  }, []);

  async function fetchVehicles() {
    try {
      const res = await apiRequest("/api/vehicles?limit=1000");
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  }

  async function fetchEmployees() {
    try {
      // Fetch only agents for the bills filter
      const res = await apiRequest("/api/employees?limit=1000&type=agent");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async function handleVehicleSearch(searchTerm: string) {
    setVehicleSearchTerm(searchTerm);
    if (searchTerm.trim() === "") {
      setVehicles([]);
      return;
    }

    setIsSearchingVehicles(true);
    try {
      const res = await apiRequest(
        `/api/vehicles?search=${encodeURIComponent(searchTerm)}&limit=100`
      );
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error("Error searching vehicles:", error);
    } finally {
      setIsSearchingVehicles(false);
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      let url = "";
      const params = new URLSearchParams();

      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      switch (activeTab) {
        case "employees":
          url = `/api/reports/employees?${params}`;
          break;
        case "vehicles":
          url = `/api/reports/vehicles?${params}`;
          break;
        case "payments":
          if (filters.vehicleId) params.append("vehicleId", filters.vehicleId);
          if (filters.paymentStatus) params.append("status", filters.paymentStatus);
          url = `/api/reports/payments?${params}`;
          break;
        case "bills":
          if (filters.billType) params.append("type", filters.billType);
          if (filters.employeeId) params.append("employeeId", filters.employeeId);
          url = `/api/reports/bills?${params}`;
          break;
      }

      const res = await apiRequest(url);
      const data = await res.json();

      if (data.success) {
        setReportData(data.data);
        toast.success("Report generated successfully");
      } else {
        toast.error(data.error || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("An error occurred while generating report");
    } finally {
      setLoading(false);
    }
  }

  function downloadExcel() {
    if (!reportData) return;

    switch (activeTab) {
      case "employees":
        const employeeData = reportData.map((emp: any, idx: number) => ({
          siNo: idx + 1,
          name: emp.name,
          iqamaId: emp.iqamaId,
          phone: emp.phone || "",
          type: emp.type || "employee",
          joinDate: emp.joinDate ? formatDate(emp.joinDate) : "",
          vehicleAssigned: emp.vehicleNumbers && emp.vehicleNumbers.length > 0
            ? emp.vehicleNumbers.join(", ")
            : "",
        }));
        exportToExcel(
          employeeData,
          [
            { header: "SI No.", key: "siNo", width: 8 },
            { header: "Name", key: "name", width: 25 },
            { header: "Iqama ID (10 digits)", key: "iqamaId", width: 20 },
            { header: "Phone (966XXXXXXXXX)", key: "phone", width: 25 },
            { header: "Type (employee/agent)", key: "type", width: 20 },
            { header: "Join Date (YYYY-MM-DD)", key: "joinDate", width: 20 },
            { header: "Vehicle Assigned", key: "vehicleAssigned", width: 35 },
          ],
          "employee-report"
        );
        break;

      case "vehicles":
        // Prepare data with vehicle details matching bulk upload template format
        const vehicleData = reportData.map((vehicle: any, idx: number) => ({
          siNo: idx + 1,
          number: vehicle.number,
          name: vehicle.name,
          serialNumber: vehicle.serialNumber || "",
          type: vehicle.type === "private" ? "private" : "public",
          vehicleModel: vehicle.vehicleModel || "",
          vehicleAmount: vehicle.vehicleAmount || "",
          startDate: vehicle.startDate ? formatDate(vehicle.startDate) : "",
          contractExpiry: vehicle.contractExpiry ? formatDate(vehicle.contractExpiry) : "",
          description: vehicle.description || "",
          employeeIqamaId: vehicle.employeeId?.iqamaId || "",
        }));

        // Build columns array to match bulk upload template
        const vehicleColumns = [
          { header: "SI No.", key: "siNo", width: 8 },
          { header: "Vehicle Number", key: "number", width: 18 },
          { header: "Vehicle Name", key: "name", width: 25 },
          { header: "Serial Number", key: "serialNumber", width: 18 },
          { header: "Type (private/public)", key: "type", width: 20 },
          { header: "Model", key: "vehicleModel", width: 15 },
          { header: "Vehicle Amount (SAR)", key: "vehicleAmount", width: 20 },
          { header: "Start Date (YYYY-MM-DD)", key: "startDate", width: 20 },
          { header: "Contract Expiry (YYYY-MM-DD)", key: "contractExpiry", width: 25 },
          { header: "Description", key: "description", width: 35 },
          { header: "Employee Iqama ID (Optional)", key: "employeeIqamaId", width: 25 },
        ];

        exportToExcel(vehicleData, vehicleColumns, "vehicle-report");
        break;

      case "payments":
        // Find max number of installments across all payments
        const maxInstallmentsCount = Math.max(
          ...reportData.payments.map((p: any) => p.installments?.length || 0),
          0
        );

        const paymentData = reportData.payments.map((payment: any, idx: number) => {
          const row: any = {
            siNo: idx + 1,
            vehicle: payment.vehicleId ? payment.vehicleId.number : "Deleted Vehicle",
            date: formatDate(payment.date),
            totalAmount: payment.totalAmount,
          };

          // Add installment columns combined (date/amount in one cell)
          const installments = payment.installments || [];
          for (let i = 0; i < maxInstallmentsCount; i++) {
            const inst = installments[i];
            if (inst) {
              row[`installment_${i + 1}`] = `${formatDate(inst.date)}\n${formatCurrency(inst.amount)}`;
            } else {
              row[`installment_${i + 1}`] = "";
            }
          }

          row.paidAmount = payment.paidAmount;
          row.dues = payment.dues;
          return row;
        });

        // Build columns array dynamically
        const paymentColumns = [
          { header: "SI No.", key: "siNo", width: 8 },
          { header: "Vehicle", key: "vehicle", width: 18 },
          { header: "Date", key: "date", width: 12 },
          { header: "Total Amount (SAR)", key: "totalAmount", width: 18 },
        ];

        // Add installment columns (combined date and amount)
        for (let i = 0; i < maxInstallmentsCount; i++) {
          paymentColumns.push(
            { header: `Installment ${i + 1}`, key: `installment_${i + 1}`, width: 25 }
          );
        }

        // Add summary columns
        paymentColumns.push(
          { header: "Total Paid (SAR)", key: "paidAmount", width: 18 },
          { header: "Dues (SAR)", key: "dues", width: 15 }
        );

        exportToExcel(paymentData, paymentColumns, "payment-records-report");
        break;

      case "bills":
        const billData = reportData.bills.map((bill: any) => ({
          name: bill.name,
          type: bill.type.charAt(0).toUpperCase() + bill.type.slice(1),
          date: formatDate(bill.date),
          agent: bill.employeeId?.name || "N/A",
          totalAmount: bill.totalAmount,
          paidAmount: bill.paidAmount,
          dues: bill.totalAmount - bill.paidAmount,
        }));
        exportToExcel(
          billData,
          [
            { header: "Bill Name", key: "name", width: 25 },
            { header: "Type", key: "type", width: 10 },
            { header: "Date", key: "date", width: 12 },
            { header: "Agent", key: "agent", width: 20 },
            { header: "Total Amount (SAR)", key: "totalAmount", width: 18 },
            { header: "Paid Amount (SAR)", key: "paidAmount", width: 18 },
            { header: "Dues (SAR)", key: "dues", width: 15 },
          ],
          "bills-report"
        );
        break;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        {reportData && (
          <Button onClick={downloadExcel}>
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6">
            {[
              { id: "employees", label: "Employee Report" },
              { id: "vehicles", label: "Vehicle Report" },
              { id: "payments", label: "Payment Records" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setReportData(null);
                  // Reset filters when switching tabs
                  setFilters({
                    vehicleId: "",
                    employeeId: "",
                    billType: "",
                    paymentStatus: "",
                  });
                  setVehicleSearchTerm("");
                  setVehicles([]);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>

            {/* Bills Report Filters */}
            {activeTab === "bills" && (
              <>
                <div>
                  <Label htmlFor="billType">Bill Type (Optional)</Label>
                  <Select
                    value={filters.billType || undefined}
                    onValueChange={(value) =>
                      setFilters({ ...filters, billType: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employeeId">Agent (Optional)</Label>
                  <Select
                    value={filters.employeeId || undefined}
                    onValueChange={(value) =>
                      setFilters({ ...filters, employeeId: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name} - {emp.iqamaId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Payments Report Filters */}
            {activeTab === "payments" && (
              <>
                <div>
                  <Label htmlFor="vehicleId">Vehicle (Optional)</Label>
                  <SearchableSelect
                    options={vehicles.map((vehicle) => ({
                      value: vehicle._id,
                      label: vehicle.number,
                      subtitle: vehicle.name,
                    }))}
                    value={filters.vehicleId}
                    onChange={(value) =>
                      setFilters({ ...filters, vehicleId: value })
                    }
                    onSearchChange={handleVehicleSearch}
                    loading={isSearchingVehicles}
                    placeholder="Select vehicle..."
                    searchPlaceholder="Search vehicles..."
                    emptyMessage="No vehicle found. Start typing to search..."
                  />
                </div>
                <div>
                  <Label htmlFor="paymentStatus">Payment Status (Optional)</Label>
                  <Select
                    value={filters.paymentStatus || undefined}
                    onValueChange={(value) =>
                      setFilters({ ...filters, paymentStatus: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="space-y-6">
          {activeTab === "employees" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Employee Report with Vehicle Counts
              </h2>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SI No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Iqama ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Vehicles Assigned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((emp: any, idx: number) => (
                      <tr key={emp._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {emp.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {emp.iqamaId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {emp.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {emp.vehicleCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "vehicles" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Vehicle Report with Full Details
              </h2>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SI No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vehicle Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vehicle Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Serial Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount (SAR)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Contract Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee Iqama ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((vehicle: any, idx: number) => (
                      <tr key={vehicle._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.serialNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.type === "private" ? "Private" : "Public"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.vehicleModel || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(vehicle.vehicleAmount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.startDate ? formatDate(vehicle.startDate) : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.contractExpiry ? formatDate(vehicle.contractExpiry) : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {vehicle.description || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.employeeId?.iqamaId || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment Records Report</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(reportData.summary?.totalAmount || 0)}
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
                      {formatCurrency(reportData.summary?.paidAmount || 0)}
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
                      {formatCurrency(reportData.summary?.dueAmount || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SI No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      {reportData.payments.length > 0 &&
                        reportData.payments.reduce((max: number, p: any) => Math.max(max, p.installments?.length || 0), 0) > 0 &&
                        Array.from({ length: reportData.payments.reduce((max: number, p: any) => Math.max(max, p.installments?.length || 0), 0) }).map((_, idx) => (
                          <th key={`installment-${idx}`} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Installment {idx + 1}
                          </th>
                        ))
                      }
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total Paid
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Dues
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.payments.map((payment: any, idx: number) => {
                      const maxInstallments = reportData.payments.reduce((max: number, p: any) => Math.max(max, p.installments?.length || 0), 0);
                      const installments = payment.installments || [];
                      return (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment.vehicleId ? payment.vehicleId.number : "Deleted Vehicle"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                            {formatCurrency(payment.totalAmount)}
                          </td>
                          {Array.from({ length: maxInstallments }).map((_, idx) => {
                            const inst = installments[idx];
                            return (
                              <td key={`inst-${payment._id}-${idx}`} className="px-6 py-4 text-center text-xs">
                                {inst ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold">{formatDate(inst.date)}</div>
                                    <div className="text-green-600 font-semibold">{formatCurrency(inst.amount)}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                            {formatCurrency(payment.paidAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-semibold">
                            {formatCurrency(payment.dues)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "bills" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Bills Report</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.summary.totalIncome)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Paid: {formatCurrency(reportData.summary.paidIncome)} | Dues:{" "}
                      {formatCurrency(reportData.summary.duesIncome)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Expense
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(reportData.summary.totalExpense)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Paid: {formatCurrency(reportData.summary.paidExpense)} | Dues:{" "}
                      {formatCurrency(reportData.summary.duesExpense)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Net
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${
                        reportData.summary.netTotal >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(reportData.summary.netTotal)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Paid: {formatCurrency(reportData.summary.netPaid)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Bill Name
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.bills.map((bill: any) => (
                      <tr key={bill._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              bill.type === "income"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {bill.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(bill.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.employeeId?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(bill.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(bill.paidAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {formatCurrency(bill.totalAmount - bill.paidAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

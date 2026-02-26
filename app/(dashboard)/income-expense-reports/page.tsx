"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Download } from "lucide-react";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel-utils";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Employee {
  _id: string;
  name: string;
  type: string;
}

interface Bill {
  _id: string;
  type: "income" | "expense";
  name: string;
  totalAmount: number;
  paidAmount: number;
  date: string;
  employeeId?: { _id: string; name: string; type: string };
}

interface ReportData {
  bills: Bill[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    paidIncome: number;
    paidExpense: number;
    duesIncome: number;
    duesExpense: number;
    netTotal: number;
    netPaid: number;
  };
}

export default function IncomeExpenseReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [filters, setFilters] = useState({
    billType: "",
    employeeId: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API_URL}/api/employees?limit=1000&type=agent`, {
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      if (filters.billType) params.append("type", filters.billType);
      if (filters.employeeId) params.append("employeeId", filters.employeeId);

      const url = `/api/reports/bills?${params.toString()}`;

      const res = await fetch(`${API_URL}${url}`, {
      });
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

    const billData = reportData.bills.map((bill: Bill) => ({
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
      "income-expense-report"
    );
  }

  if (loading && !reportData) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Income & Expense Reports</h1>
        {reportData && (
          <Button onClick={downloadExcel}>
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        )}
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-lg shadow">
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
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(reportData.summary.totalIncome)}
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Paid: {formatCurrency(reportData.summary.paidIncome)} | Dues:{" "}
                  {formatCurrency(reportData.summary.duesIncome)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700">
                  Total Expense
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">
                  {formatCurrency(reportData.summary.totalExpense)}
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Paid: {formatCurrency(reportData.summary.paidExpense)} | Dues:{" "}
                  {formatCurrency(reportData.summary.duesExpense)}
                </p>
              </CardContent>
            </Card>
            <Card
              className={`bg-gradient-to-br ${
                reportData.summary.netTotal >= 0
                  ? "from-blue-50 to-blue-100 border-blue-200"
                  : "from-orange-50 to-orange-100 border-orange-200"
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={`text-sm font-medium ${
                    reportData.summary.netTotal >= 0 ? "text-blue-700" : "text-orange-700"
                  }`}
                >
                  Net
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    reportData.summary.netTotal >= 0
                      ? "text-blue-900"
                      : "text-orange-900"
                  }`}
                >
                  {formatCurrency(reportData.summary.netTotal)}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    reportData.summary.netTotal >= 0 ? "text-blue-700" : "text-orange-700"
                  }`}
                >
                  Paid: {formatCurrency(reportData.summary.netPaid)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
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
                {reportData.bills.map((bill) => (
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
            {reportData.bills.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No transactions found for the selected filters
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial State Message */}
      {!reportData && !loading && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">Set your filters and click "Generate Report" to view the income and expense report</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
import { Download, Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel-utils";

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

export default function IncomeExpenseReportsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    filterData();
  }, [bills, dateRange, filterType]);

  async function fetchBills() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bills`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setBills(data.data);
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterData() {
    let filtered = bills;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((b) => b.type === filterType);
    }

    // Filter by date range
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((b) => {
        const date = new Date(b.date);
        return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
      });
    }

    setFilteredBills(filtered);
  }

  function downloadExcel() {
    // Prepare data for Excel
    const excelData = filteredBills.map((bill) => ({
      date: formatDate(bill.date),
      type: bill.type.charAt(0).toUpperCase() + bill.type.slice(1),
      name: bill.name,
      agent: bill.employeeId?.name || "N/A",
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      dues: bill.totalAmount - bill.paidAmount,
      status: getPaymentStatus(bill.totalAmount, bill.paidAmount),
    }));

    const columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Type", key: "type", width: 10 },
      { header: "Name", key: "name", width: 25 },
      { header: "Agent", key: "agent", width: 20 },
      { header: "Total Amount (SAR)", key: "totalAmount", width: 18 },
      { header: "Paid Amount (SAR)", key: "paidAmount", width: 18 },
      { header: "Dues (SAR)", key: "dues", width: 15 },
      { header: "Status", key: "status", width: 12 },
    ];

    exportToExcel(excelData, columns, "income-expense-report");
  }

  // Calculate summary
  const totalIncome = filteredBills
    .filter((b) => b.type === "income")
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const totalExpense = filteredBills
    .filter((b) => b.type === "expense")
    .reduce((sum, b) => sum + b.totalAmount, 0);
  const totalPaidIncome = filteredBills
    .filter((b) => b.type === "income")
    .reduce((sum, b) => sum + b.paidAmount, 0);
  const totalPaidExpense = filteredBills
    .filter((b) => b.type === "expense")
    .reduce((sum, b) => sum + b.paidAmount, 0);
  const netProfit = totalIncome - totalExpense;

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Income & Expense Reports</h1>
        <Button onClick={downloadExcel} disabled={filteredBills.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filterType">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expense Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(totalIncome)}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-green-600 mt-1">
              Paid: {formatCurrency(totalPaidIncome)}
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
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(totalExpense)}
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-red-600 mt-1">
              Paid: {formatCurrency(totalPaidExpense)}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br ${
            netProfit >= 0
              ? "from-blue-50 to-blue-100 border-blue-200"
              : "from-orange-50 to-orange-100 border-orange-200"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-sm font-medium ${
                netProfit >= 0 ? "text-blue-700" : "text-orange-700"
              }`}
            >
              Net Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div
                className={`text-2xl font-bold ${
                  netProfit >= 0 ? "text-blue-900" : "text-orange-900"
                }`}
              >
                {formatCurrency(netProfit)}
              </div>
              <TrendingUp
                className={`h-8 w-8 ${netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Income Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {filteredBills.filter((b) => b.type === "income").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">
              Expense Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">
              {filteredBills.filter((b) => b.type === "expense").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(bill.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={bill.type === "income" ? "default" : "secondary"}>
                        {bill.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.name}
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
                      <Badge
                        variant={
                          getPaymentStatus(bill.totalAmount, bill.paidAmount) === "paid"
                            ? "success"
                            : getPaymentStatus(bill.totalAmount, bill.paidAmount) === "partial"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {getPaymentStatus(bill.totalAmount, bill.paidAmount)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBills.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No transactions found for the selected filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

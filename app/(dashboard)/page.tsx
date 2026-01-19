"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Car, CreditCard, FileText, Calendar, DollarSign, ArrowRight } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { VehiclePaymentsChart } from "@/components/charts/vehicle-payments-chart";
import { ChartCarousel } from "@/components/charts/chart-carousel";
import { formatCurrency, formatDate, getPaymentStatus } from "@/lib/utils";
import { apiRequest } from "@/lib/api-config";
import { useYearFilter } from "@/contexts/YearFilterContext";

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

interface Bill {
  _id: string;
  type: "income" | "expense";
  name: string;
  totalAmount: number;
  paidAmount: number;
  date: string;
  employeeId?: { _id: string; name: string; type: string };
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectedYear } = useYearFilter();
  const [stats, setStats] = useState({
    employees: 0,
    vehicles: 0,
    unassignedVehicles: 0,
    payments: 0,
    bills: 0,
  });

  const [recentPayments, setRecentPayments] = useState<PaymentWithInstallments[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentWithInstallments[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });
console.log(recentPayments);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refetch when year changes
  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // Single API call for all dashboard data!
      const res = await apiRequest(`/api/reports/dashboard?year=${selectedYear}`);
      const result = await res.json();

      // Fetch unassigned vehicles count
      const vehiclesRes = await apiRequest(`/api/vehicles?assigned=false&limit=1&year=${selectedYear}`);
      const vehiclesResult = await vehiclesRes.json();

      if (result.success) {
        const { counts, recent } = result.data;
        let unassignedCount = 0;

        // Get unassigned vehicles count from pagination
        if (vehiclesResult.success && vehiclesResult.pagination) {
          unassignedCount = vehiclesResult.pagination.total;
        }

        // Set counts
        setStats({
          employees: counts.employees,
          vehicles: counts.vehicles,
          unassignedVehicles: unassignedCount,
          payments: counts.payments,
          bills: counts.bills,
        });

        // Set recent payments (already have paidAmount and dues from backend)
        setRecentPayments(recent.payments || []);
        setAllPayments(recent.payments || []);

        // Set recent bills
        setRecentBills(recent.bills || []);
        setAllBills(recent.bills || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(totalAmount: number, paidAmount: number) {
    const status = getPaymentStatus(totalAmount, paidAmount);
    const variant =
      status === "paid" ? "success" : status === "partial" ? "warning" : "danger";
    return <Badge variant={variant}>{status}</Badge>;
  }

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Filter data by date range
  const filteredPayments = dateRange.from && dateRange.to
    ? allPayments.filter((p) => {
        const date = new Date(p.date);
        return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
      })
    : allPayments;

  const filteredBills = dateRange.from && dateRange.to
    ? allBills.filter((b) => {
        const date = new Date(b.date);
        return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
      })
    : allBills;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        {/* Date Filter */}
        {/* <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="dateFrom" className="text-xs">From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-xs">To</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-40"
            />
          </div>
        </div> */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/employees')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.employees}</div>
          </CardContent>
        </Card>
        <Card
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/vehicles')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Unassigned Vehicles
            </CardTitle>
            <Car className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.unassignedVehicles}</div>
          </CardContent>
        </Card>
        <Card
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/payments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Unpaid Payments
            </CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.payments}</div>
          </CardContent>
        </Card>
        <Card
          className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/bills')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Income & Expense</CardTitle>
            <FileText className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{stats.bills}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Auto-Rotating Carousel */}
      <Card>
        <CardContent className="pt-6">
          <ChartCarousel
            charts={[
              {
                title: "Income & Expense Trends",
                component: <IncomeExpenseChart bills={filteredBills} />,
              },
              {
                title: "Vehicle Payments Overview",
                component: <VehiclePaymentsChart payments={filteredPayments} />,
              },
            ]}
            autoRotate={true}
            intervalMs={5000}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Vehicle Payments */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 h-[500px] overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-indigo-900">
                <CreditCard className="h-5 w-5 mr-2 text-indigo-700" />
                Recent Vehicle Payments
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/vehicles')}
                className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-200"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div
                  key={payment._id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-indigo-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {payment.vehicleId ? payment.vehicleId.number : "Deleted Vehicle"}
                        </h3>
                        {getStatusBadge(payment.totalAmount, payment.paidAmount)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {payment.vehicleId ? payment.vehicleId.name : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(payment.totalAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                    <div className="flex items-center text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(payment.date)}
                    </div>
                    {/* <div className="flex space-x-4">
                      <span className="text-green-600 font-semibold">
                        Paid: {formatCurrency(payment.paidAmount)}
                      </span>
                      <span className="text-red-600 font-semibold">
                        Due: {formatCurrency(payment.dues)}
                      </span>
                    </div> */}
                  </div>
                  {payment.remarks && (
                    <p className="text-xs text-gray-500 mt-2 italic">{payment.remarks}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-indigo-200">
                No recent vehicle payments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Income & Expense */}
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-rose-900">
                <FileText className="h-5 w-5 mr-2 text-rose-700" />
                Recent Transactions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/bills')}
                className="text-rose-700 hover:text-rose-900 hover:bg-rose-200"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBills.length > 0 ? (
              recentBills.map((bill) => (
                <div
                  key={bill._id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-rose-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{bill.name}</h3>
                        <Badge variant={bill.type === "income" ? "default" : "secondary"}>
                          {bill.type}
                        </Badge>
                        {getStatusBadge(bill.totalAmount, bill.paidAmount)}
                      </div>
                      {bill.employeeId && (
                        <p className="text-sm text-gray-600">Agent: {bill.employeeId.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(bill.totalAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                    <div className="flex items-center text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(bill.date)}
                    </div>
                    <div className="flex space-x-4">
                      <span className="text-green-600 font-semibold">
                        Paid: {formatCurrency(bill.paidAmount)}
                      </span>
                      <span className="text-red-600 font-semibold">
                        Due: {formatCurrency(bill.totalAmount - bill.paidAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-rose-200">
                No recent transactions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, CreditCard, FileText } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    employees: 0,
    vehicles: 0,
    payments: 0,
    bills: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [employeesRes, vehiclesRes, paymentsRes, billsRes] =
          await Promise.all([
            fetch("/api/employees"),
            fetch("/api/vehicles"),
            fetch("/api/payments"),
            fetch("/api/bills"),
          ]);

        const [employees, vehicles, payments, bills] = await Promise.all([
          employeesRes.json(),
          vehiclesRes.json(),
          paymentsRes.json(),
          billsRes.json(),
        ]);

        setStats({
          employees: employees.data?.length || 0,
          vehicles: vehicles.data?.length || 0,
          payments: payments.data?.length || 0,
          bills: bills.data?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vehicles
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Records
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bills}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

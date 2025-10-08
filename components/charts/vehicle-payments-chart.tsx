"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Payment {
  vehicleId: { number: string; name: string };
  totalAmount: number;
  paidAmount?: number;
}

interface VehiclePaymentsChartProps {
  payments: Payment[];
}

export function VehiclePaymentsChart({ payments }: VehiclePaymentsChartProps) {
  // Group payments by vehicle
  const vehicleData = payments.reduce((acc: any, payment) => {
    const vehicleKey = payment.vehicleId.number;

    if (!acc[vehicleKey]) {
      acc[vehicleKey] = {
        name: payment.vehicleId.name,
        total: 0,
        paid: 0,
      };
    }

    acc[vehicleKey].total += payment.totalAmount;
    acc[vehicleKey].paid += payment.paidAmount || 0;

    return acc;
  }, {});

  // Get top 5 vehicles by payment amount and format for Recharts
  const sortedVehicles = Object.entries(vehicleData)
    .sort(([, a]: any, [, b]: any) => b.total - a.total)
    .slice(0, 5);

  const chartData = sortedVehicles.map(([key, data]: any) => ({
    vehicle: key,
    "Total Amount": data.total,
    "Paid Amount": data.paid,
    "Due Amount": data.total - data.paid,
  }));

  const formatCurrency = (value: number) => {
    return `SAR ${value.toLocaleString()}`;
  };

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="vehicle"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend
            wrapperStyle={{ fontSize: "14px", paddingTop: "10px" }}
            iconType="circle"
          />
          <Bar
            dataKey="Total Amount"
            fill="#6366f1"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="Paid Amount"
            fill="#22c55e"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="Due Amount"
            fill="#ef4444"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

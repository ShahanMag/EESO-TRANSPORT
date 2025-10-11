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
  Cell,
} from "recharts";

interface Payment {
  vehicleId: { number: string; name: string } | null;
  totalAmount: number;
  paidAmount?: number;
}

interface VehiclePaymentsChartProps {
  payments: Payment[];
}

export function VehiclePaymentsChart({ payments }: VehiclePaymentsChartProps) {
  // Filter out payments with deleted vehicles (null vehicleId)
  const validPayments = payments.filter((payment) => payment.vehicleId !== null);

  // Calculate total amounts across all vehicles
  const totalAmount = validPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
  const paidAmount = validPayments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
  const dueAmount = totalAmount - paidAmount;

  // Format data for single bar chart
  const chartData = [
    {
      category: "Total",
      amount: totalAmount,
      label: "Total Amount",
    },
    {
      category: "Paid",
      amount: paidAmount,
      label: "Paid Amount",
    },
    {
      category: "Due",
      amount: dueAmount,
      label: "Due Amount",
    },
  ];

  const formatCurrency = (value: number) => {
    return `SAR ${value.toLocaleString()}`;
  };

  // Colors for each bar
  const colors = ["#6366f1", "#22c55e", "#ef4444"]; // Indigo, Green, Red

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="category"
            stroke="#6b7280"
            style={{ fontSize: "14px", fontWeight: 600 }}
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
              padding: "12px",
            }}
            formatter={(value: number, name: string, props: any) => [
              formatCurrency(value),
              props.payload.label
            ]}
            labelStyle={{ fontWeight: 600, marginBottom: "4px" }}
          />
          <Bar
            dataKey="amount"
            radius={[8, 8, 0, 0]}
            maxBarSize={150}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

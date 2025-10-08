"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Bill {
  type: "income" | "expense";
  totalAmount: number;
  date: string;
}

interface IncomeExpenseChartProps {
  bills: Bill[];
}

export function IncomeExpenseChart({ bills }: IncomeExpenseChartProps) {
  // Group bills by month
  const monthlyData = bills.reduce((acc: any, bill) => {
    const month = new Date(bill.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });

    if (!acc[month]) {
      acc[month] = { income: 0, expense: 0 };
    }

    if (bill.type === "income") {
      acc[month].income += bill.totalAmount;
    } else {
      acc[month].expense += bill.totalAmount;
    }

    return acc;
  }, {});

  // Get last 6 months and format for Recharts
  const months = Object.keys(monthlyData).slice(-6);
  const chartData = months.map((month) => ({
    month,
    Income: monthlyData[month].income,
    Expense: monthlyData[month].expense,
  }));

  const formatCurrency = (value: number) => {
    return `SAR ${value.toLocaleString()}`;
  };

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
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
          <Area
            type="monotone"
            dataKey="Income"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorIncome)"
          />
          <Area
            type="monotone"
            dataKey="Expense"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorExpense)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

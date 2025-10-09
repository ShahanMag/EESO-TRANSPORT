"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

  // Get last 6 months
  const months = Object.keys(monthlyData).slice(-6);
  const incomeData = months.map((month) => monthlyData[month].income);
  const expenseData = months.map((month) => monthlyData[month].expense);

  const data = {
    labels: months,
    datasets: [
      {
        label: "Income",
        data: incomeData,
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Expense",
        data: expenseData,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "SAR " + value.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Line data={data} options={options} />
    </div>
  );
}

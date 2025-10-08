"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  // Get top 5 vehicles by payment amount
  const sortedVehicles = Object.entries(vehicleData)
    .sort(([, a]: any, [, b]: any) => b.total - a.total)
    .slice(0, 5);

  const labels = sortedVehicles.map(([key]) => key);
  const totalData = sortedVehicles.map(([, data]: any) => data.total);
  const paidData = sortedVehicles.map(([, data]: any) => data.paid);
  const dueData = sortedVehicles.map(([, data]: any) => data.total - data.paid);

  const data = {
    labels,
    datasets: [
      {
        label: "Total Amount",
        data: totalData,
        backgroundColor: "rgba(99, 102, 241, 0.8)",
      },
      {
        label: "Paid Amount",
        data: paidData,
        backgroundColor: "rgba(34, 197, 94, 0.8)",
      },
      {
        label: "Due Amount",
        data: dueData,
        backgroundColor: "rgba(239, 68, 68, 0.8)",
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
      <Bar data={data} options={options} />
    </div>
  );
}

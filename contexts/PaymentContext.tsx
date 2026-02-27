"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useYearFilter } from "./YearFilterContext";

export interface Payment {
  _id: string;
  vehicleId: { _id: string; number: string; name: string };
  amount: number;
  paymentDate: string;
  paymentType?: string;
  description?: string;
}

interface PaymentContextType {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  fetchPayments: () => Promise<void>;
  refetchPayments: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const { selectedYear } = useYearFilter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch on mount and refetch when year changes
  useEffect(() => {
    fetchPayments();
  }, [selectedYear]);

  async function fetchPayments() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        year: selectedYear.toString(),
      });

      const res = await fetch(
        `${API_URL}/api/payments?${params.toString()}`,
        {
        }
      );
      const data = await res.json();

      if (data.success) {
        setPayments(data.data);
      } else {
        setError("Failed to fetch payments");
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Error fetching payments");
    } finally {
      setLoading(false);
    }
  }

  async function refetchPayments() {
    await fetchPayments();
  }

  return (
    <PaymentContext.Provider
      value={{
        payments,
        loading,
        error,
        fetchPayments,
        refetchPayments,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayments() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error("usePayments must be used within PaymentProvider");
  }
  return context;
}

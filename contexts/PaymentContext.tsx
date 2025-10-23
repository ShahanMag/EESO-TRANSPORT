"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch on mount
  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      const res = await fetch(
        `${API_URL}/api/payments?${params.toString()}`,
        {
          credentials: "include",
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

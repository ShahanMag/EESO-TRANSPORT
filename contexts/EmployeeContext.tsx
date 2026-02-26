"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useYearFilter } from "./YearFilterContext";

export interface Employee {
  _id: string;
  name: string;
  iqamaId?: string;
  phone?: string;
  type: "employee" | "agent";
  joinDate?: string;
  image?: string;
  imageUrls?: string[];
  terminationDate?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  fetchEmployees: (page?: number, limit?: number) => Promise<void>;
  refetchEmployees: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setItemsPerPage: (limit: number) => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const { selectedYear } = useYearFilter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 100,
  });

  // Initial fetch on mount
  useEffect(() => {
    fetchEmployees(1, 100);
  }, []);

  // Refetch when year changes
  useEffect(() => {
    fetchEmployees(pagination.currentPage, pagination.itemsPerPage);
  }, [selectedYear]);

  async function fetchEmployees(page = 1, limit = 100) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        year: selectedYear.toString(),
      });

      const res = await fetch(`${API_URL}/api/employees?${params.toString()}`, {
      });
      const data = await res.json();

      if (data.success) {
        setEmployees(data.data);
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.page,
            totalPages: data.pagination.totalPages,
            totalItems: data.pagination.total,
            itemsPerPage: data.pagination.limit,
          });
        }
      } else {
        setError("Failed to fetch employees");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Error fetching employees");
    } finally {
      setLoading(false);
    }
  }

  async function refetchEmployees() {
    await fetchEmployees(pagination.currentPage, pagination.itemsPerPage);
  }

  async function goToPage(page: number) {
    await fetchEmployees(page, pagination.itemsPerPage);
  }

  async function setItemsPerPage(limit: number) {
    await fetchEmployees(1, limit);
  }

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        loading,
        error,
        pagination,
        fetchEmployees,
        refetchEmployees,
        goToPage,
        setItemsPerPage,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployees() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error("useEmployees must be used within EmployeeProvider");
  }
  return context;
}

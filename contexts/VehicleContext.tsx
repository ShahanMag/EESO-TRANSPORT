"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Vehicle {
  _id: string;
  number: string;
  name: string;
  serialNumber?: string;
  type: "private" | "public";
  vehicleModel?: string;
  vehicleAmount?: number;
  startDate?: string;
  contractExpiry?: string;
  description?: string;
  employeeId: { _id: string; name: string; type: string } | null;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface VehicleContextType {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  fetchVehicles: (page?: number, limit?: number) => Promise<void>;
  refetchVehicles: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setItemsPerPage: (limit: number) => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
    fetchVehicles(1, 100);
  }, []);

  async function fetchVehicles(page = 1, limit = 100) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const url = `/api/vehicles?${params.toString()}`;
      const res = await fetch(`${API_URL}${url}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setVehicles(data.data);
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.page,
            totalPages: data.pagination.totalPages,
            totalItems: data.pagination.total,
            itemsPerPage: data.pagination.limit,
          });
        }
      } else {
        setError("Failed to fetch vehicles");
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError("Error fetching vehicles");
    } finally {
      setLoading(false);
    }
  }

  async function refetchVehicles() {
    await fetchVehicles(pagination.currentPage, pagination.itemsPerPage);
  }

  async function goToPage(page: number) {
    await fetchVehicles(page, pagination.itemsPerPage);
  }

  async function setItemsPerPage(limit: number) {
    await fetchVehicles(1, limit);
  }

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        loading,
        error,
        pagination,
        fetchVehicles,
        refetchVehicles,
        goToPage,
        setItemsPerPage,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicles() {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error("useVehicles must be used within VehicleProvider");
  }
  return context;
}

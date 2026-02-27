"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useYearFilter } from "./YearFilterContext";

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
  searchTerm: string;
  pendingSearch: string;
  fetchVehicles: (page?: number, limit?: number, terminated?: boolean, assigned?: boolean | null, search?: string) => Promise<void>;
  refetchVehicles: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setItemsPerPage: (limit: number) => Promise<void>;
  setShowTerminated: (show: boolean) => Promise<void>;
  setAssignedFilter: (assigned: boolean | null) => Promise<void>;
  searchVehicles: (search: string) => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const { selectedYear } = useYearFilter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 100,
  });
  const [showTerminated, setShowTerminatedState] = useState(false);
  const [assignedFilter, setAssignedFilterState] = useState<boolean | null>(null);
  const [searchTerm, setSearchTermState] = useState<string>("");
  const [pendingSearch, setPendingSearchState] = useState<string>("");

  // Fetch on mount and refetch when year changes
  useEffect(() => {
    fetchVehicles(1, pagination.itemsPerPage, showTerminated, assignedFilter, searchTerm);
  }, [selectedYear]);

  // Debounce search - only call API after user stops typing for 500ms
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (pendingSearch !== searchTerm) {
        setSearchTermState(pendingSearch);
        // Fetch with the new search term
        fetchVehicles(1, pagination.itemsPerPage, showTerminated, assignedFilter, pendingSearch);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [pendingSearch]);

  async function fetchVehicles(page = 1, limit = 100, terminated = false, assigned: boolean | null = null, search: string = "") {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        year: selectedYear.toString(),
      });

      // Add terminated filter if needed
      if (terminated) {
        params.append("terminated", "true");
      }

      // Add assigned filter if needed
      if (assigned !== null) {
        params.append("assigned", assigned.toString());
      }

      // Add search parameter if needed
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const url = `/api/vehicles?${params.toString()}`;
      const res = await fetch(`${API_URL}${url}`, {
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
    await fetchVehicles(pagination.currentPage, pagination.itemsPerPage, showTerminated, assignedFilter, searchTerm);
  }

  async function goToPage(page: number) {
    await fetchVehicles(page, pagination.itemsPerPage, showTerminated, assignedFilter, searchTerm);
  }

  async function setItemsPerPage(limit: number) {
    await fetchVehicles(1, limit, showTerminated, assignedFilter, searchTerm);
  }

  async function setShowTerminated(show: boolean) {
    setShowTerminatedState(show);
    await fetchVehicles(1, pagination.itemsPerPage, show, assignedFilter, searchTerm);
  }

  async function setAssignedFilter(assigned: boolean | null) {
    setAssignedFilterState(assigned);
    await fetchVehicles(1, pagination.itemsPerPage, showTerminated, assigned, searchTerm);
  }

  function searchVehicles(search: string) {
    // Just update the pending search - the useEffect will debounce and call the API
    setPendingSearchState(search);
  }

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        loading,
        error,
        pagination,
        searchTerm,
        pendingSearch,
        fetchVehicles,
        refetchVehicles,
        goToPage,
        setItemsPerPage,
        setShowTerminated,
        setAssignedFilter,
        searchVehicles,
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

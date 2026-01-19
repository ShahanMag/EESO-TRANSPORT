"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface YearFilterContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  isYearChanging: boolean;
}

const YearFilterContext = createContext<YearFilterContextType | undefined>(undefined);

export function YearFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number>(new Date().getFullYear());
  const [isYearChanging, setIsYearChanging] = useState(false);

  // Load year from session storage on mount
  useEffect(() => {
    const savedYear = sessionStorage.getItem("selectedYear");
    if (savedYear) {
      setSelectedYearState(parseInt(savedYear, 10));
    }
  }, []);

  const setSelectedYear = (year: number) => {
    setIsYearChanging(true);
    setSelectedYearState(year);
    sessionStorage.setItem("selectedYear", year.toString());

    // Reset loading state after a short delay to allow all contexts to refetch
    setTimeout(() => {
      setIsYearChanging(false);
    }, 500);
  };

  return (
    <YearFilterContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        isYearChanging,
      }}
    >
      {children}
    </YearFilterContext.Provider>
  );
}

export function useYearFilter() {
  const context = useContext(YearFilterContext);
  if (context === undefined) {
    throw new Error("useYearFilter must be used within YearFilterProvider");
  }
  return context;
}

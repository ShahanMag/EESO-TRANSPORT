"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  onSearchChange?: (search: string) => void; // Optional callback for external search handling
  loading?: boolean; // Optional loading state
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  emptyMessage = "No option found.",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  onSearchChange,
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search (only if onSearchChange is not provided)
  const filteredOptions = React.useMemo(() => {
    // If external search is provided, don't filter locally
    if (onSearchChange) return options;

    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        option.subtitle?.toLowerCase().includes(searchLower)
    );
  }, [options, search, onSearchChange]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue === value ? "" : optionValue);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex flex-col items-start overflow-hidden text-left flex-1">
          {selectedOption ? (
            <>
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.subtitle && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedOption.subtitle}
                </span>
              )}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {value && !disabled && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover rounded-md border shadow-md">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // Call external search handler if provided
                if (onSearchChange) {
                  onSearchChange(e.target.value);
                }
              }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-2 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    "transition-colors",
                    value === option.value && "bg-accent"
                  )}
                >
                  <div className="flex flex-col flex-1 overflow-hidden text-left">
                    <span className="truncate">{option.label}</span>
                    {option.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.subtitle}
                      </span>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="ml-2 h-4 w-4 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

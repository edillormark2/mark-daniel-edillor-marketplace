// src/hooks/useFilters.ts
import { useState, useCallback, useEffect } from "react";
import { PostFilters } from "@/lib/posts";

export interface UseFiltersReturn {
  filters: PostFilters;
  setFilters: (filters: PostFilters) => void;
  updateFilter: (key: keyof PostFilters, value: any) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  filterCount: number;
}

export const useFilters = (
  initialFilters: PostFilters = {}
): UseFiltersReturn => {
  const [filters, setFiltersState] = useState<PostFilters>(initialFilters);

  // Update a single filter
  const updateFilter = useCallback((key: keyof PostFilters, value: any) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  // Set all filters
  const setFilters = useCallback((newFilters: PostFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  // Check if there are active filters
  const hasActiveFilters =
    Object.keys(filters).length > 0 &&
    Object.values(filters).some((value) => value !== undefined && value !== "");

  // Count active filters
  const filterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== ""
  ).length;

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    filterCount,
  };
};

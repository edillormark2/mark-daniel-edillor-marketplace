// src/lib/filterUtils.ts
import { PostFilters } from "./posts";

/**
 * Convert filters to URL search parameters
 */
export const filtersToSearchParams = (
  filters: PostFilters
): URLSearchParams => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value.toString());
    }
  });

  return params;
};

/**
 * Convert URL search parameters to filters
 */
export const searchParamsToFilters = (
  searchParams: URLSearchParams
): PostFilters => {
  const filters: PostFilters = {};

  const search = searchParams.get("search");
  if (search) filters.search = search;

  const category = searchParams.get("category");
  if (category) filters.category = category;

  const subcategory = searchParams.get("subcategory");
  if (subcategory) filters.subcategory = subcategory;

  const campus = searchParams.get("campus");
  if (campus) filters.campus = campus;

  const minPrice = searchParams.get("minPrice");
  if (minPrice) filters.minPrice = parseFloat(minPrice);

  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

  return filters;
};

/**
 * Update URL with current filters
 */
export const updateUrlWithFilters = (
  filters: PostFilters,
  replace = false
): void => {
  const params = filtersToSearchParams(filters);
  const url = new URL(window.location.href);

  // Clear existing search params
  url.search = "";

  // Add new params
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Update URL
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", url.toString());
};

/**
 * Get filters from current URL
 */
export const getFiltersFromUrl = (): PostFilters => {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  return searchParamsToFilters(params);
};

/**
 * Format filter value for display
 */
export const formatFilterValue = (
  key: keyof PostFilters,
  value: any
): string => {
  switch (key) {
    case "minPrice":
      return `$${value}+`;
    case "maxPrice":
      return `$${value} max`;
    case "search":
      return `"${value}"`;
    default:
      return value.toString();
  }
};

/**
 * Get filter display name
 */
export const getFilterDisplayName = (key: keyof PostFilters): string => {
  const displayNames: Record<keyof PostFilters, string> = {
    search: "Search",
    category: "Category",
    subcategory: "Subcategory",
    campus: "Campus",
    minPrice: "Min Price",
    maxPrice: "Max Price",
  };

  return displayNames[key] || key;
};

/**
 * Check if filter is empty
 */
export const isFilterEmpty = (value: any): boolean => {
  return value === undefined || value === null || value === "";
};

/**
 * Clean filters by removing empty values
 */
export const cleanFilters = (filters: PostFilters): PostFilters => {
  const cleaned: PostFilters = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (!isFilterEmpty(value)) {
      cleaned[key as keyof PostFilters] = value;
    }
  });

  return cleaned;
};

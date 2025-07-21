// src/components/ui/Sidebar.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  MapPin,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { MAIN_CATEGORIES, SUB_CATEGORIES, CAMPUS_LIST } from "@/lib/types";
import { PostService, PostFilters } from "@/lib/posts";
import { debounce } from "lodash";
import {
  cleanFilters,
  updateUrlWithFilters,
  getFiltersFromUrl,
} from "@/lib/filterUtils";

interface SidebarProps {
  onFiltersChange: (filters: PostFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
  initialFilters?: PostFilters;
}

interface CategoryCounts {
  [key: string]: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  onFiltersChange,
  isOpen,
  onToggle,
  initialFilters = {},
}) => {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialFilters.category || ""
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    initialFilters.subcategory || ""
  );
  const [selectedCampus, setSelectedCampus] = useState<string>(
    initialFilters.campus || ""
  );
  const [minPrice, setMinPrice] = useState<string>(
    initialFilters.minPrice?.toString() || ""
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    initialFilters.maxPrice?.toString() || ""
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-close sidebar on mobile when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        // Close sidebar on mobile when resizing to desktop
        const isMobile = window.innerWidth < 1024;
        if (!isMobile && isOpen) {
          // This prevents auto-closing when going from mobile to desktop
          return;
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Close sidebar when clicking on filter options (mobile only)
  const closeSidebarOnMobile = useCallback(() => {
    if (window.innerWidth < 1024) {
      onToggle();
    }
  }, [onToggle]);

  // Update filters and notify parent - MOVED TO TOP
  const updateFilters = useCallback(
    (newFilters: Partial<PostFilters> = {}) => {
      const filters: PostFilters = {
        search: searchQuery,
        category: selectedCategory || undefined,
        subcategory: selectedSubcategory || undefined,
        campus: selectedCampus || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        ...newFilters,
      };

      const cleanedFilters = cleanFilters(filters);

      // Update URL
      updateUrlWithFilters(cleanedFilters, true);

      // Notify parent
      onFiltersChange(cleanedFilters);
    },
    [
      searchQuery,
      selectedCategory,
      selectedSubcategory,
      selectedCampus,
      minPrice,
      maxPrice,
      onFiltersChange,
    ]
  );

  // Debounced search function - NOW CAN SAFELY REFERENCE updateFilters
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      updateFilters({ search: query });
    }, 300),
    [updateFilters]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Initialize expanded categories based on selected category
  useEffect(() => {
    if (selectedCategory) {
      setExpandedCategories((prev) => new Set(prev).add(selectedCategory));
    }
  }, [selectedCategory]);

  // Load category counts with refresh capability
  const loadCategoryCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const { data } = await PostService.getPostsCountByCategory();
      setCategoryCounts(data);
    } catch (error) {
      console.error("Failed to load category counts:", error);
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  // Load category counts on mount
  useEffect(() => {
    loadCategoryCounts();
  }, [loadCategoryCounts]);

  // Sync with URL parameters
  useEffect(() => {
    const urlFilters = getFiltersFromUrl();
    if (Object.keys(urlFilters).length > 0) {
      setSearchQuery(urlFilters.search || "");
      setSelectedCategory(urlFilters.category || "");
      setSelectedSubcategory(urlFilters.subcategory || "");
      setSelectedCampus(urlFilters.campus || "");
      setMinPrice(urlFilters.minPrice?.toString() || "");
      setMaxPrice(urlFilters.maxPrice?.toString() || "");
    }
  }, []);

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory("");
      setSelectedSubcategory("");
      setExpandedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    } else {
      setSelectedCategory(category);
      setSelectedSubcategory("");
      setExpandedCategories((prev) => new Set(prev).add(category));
    }
    closeSidebarOnMobile();
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(
      selectedSubcategory === subcategory ? "" : subcategory
    );
    closeSidebarOnMobile();
  };

  // Handle campus selection
  const handleCampusSelect = (campus: string) => {
    setSelectedCampus(selectedCampus === campus ? "" : campus);
    closeSidebarOnMobile();
  };

  // Handle search input with better UX
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Focus search input when sidebar opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onToggle();
      }
    },
    [isOpen, onToggle]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Clear all filters with better UX
  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedCampus("");
    setMinPrice("");
    setMaxPrice("");
    setExpandedCategories(new Set());
    updateFilters({
      search: "",
      category: "",
      subcategory: "",
      campus: "",
      minPrice: undefined,
      maxPrice: undefined,
    });
    closeSidebarOnMobile();
  }, [updateFilters, closeSidebarOnMobile]);

  // Validate price inputs
  const validatePrice = (value: string): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return "";
    return numValue.toString();
  };

  // Handle price input changes
  const handlePriceChange = (type: "min" | "max", value: string) => {
    const validatedValue = validatePrice(value);
    if (type === "min") {
      setMinPrice(validatedValue);
    } else {
      setMaxPrice(validatedValue);
    }
  };

  // Update filters when values change
  useEffect(() => {
    updateFilters({});
  }, [
    selectedCategory,
    selectedSubcategory,
    selectedCampus,
    minPrice,
    maxPrice,
    updateFilters,
  ]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory ||
    selectedSubcategory ||
    selectedCampus ||
    minPrice ||
    maxPrice;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
          role="button"
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:shadow-none lg:border-r lg:border-gray-200
        pt-16 /* Add padding-top to account for fixed header */
      `}
        role="complementary"
        aria-label="Filters sidebar"
      >
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
                {isLoadingCounts && (
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin text-gray-400" />
                )}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadCategoryCounts}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-black cursor-pointer"
                  title="Refresh category counts"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <label
                htmlFor="search-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search Posts
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full text-black pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-1">
                {MAIN_CATEGORIES.map((category) => {
                  const isExpanded = expandedCategories.has(category);
                  const isSelected = selectedCategory === category;
                  const count = categoryCounts[category] || 0;
                  const subcategories = SUB_CATEGORIES[category];

                  return (
                    <div key={category}>
                      <button
                        onClick={() => handleCategorySelect(category)}
                        className={`
              w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer
              ${
                isSelected
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "hover:bg-gray-50 text-gray-700"
              }
            `}
                      >
                        <div className="flex items-center">
                          <span className="text-sm font-medium">
                            {category}
                          </span>
                          {count > 0 && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-xs rounded-md text-blue-500">
                              {count}
                            </span>
                          )}
                        </div>
                        {/* Replace button with div */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(category);
                          }}
                          className="p-1 hover:bg-gray-200 rounded cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Subcategories */}
                      {isExpanded && subcategories && (
                        <div className="ml-4 mt-1 space-y-1">
                          {subcategories.map((subcategory) => (
                            <button
                              key={subcategory}
                              onClick={() =>
                                handleSubcategorySelect(subcategory)
                              }
                              className={`
                    w-full p-2 rounded-lg text-left text-sm transition-colors cursor-pointer
                    ${
                      selectedSubcategory === subcategory
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50 text-gray-600"
                    }
                  `}
                            >
                              {subcategory}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Price Range
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="min-price"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Min Price
                  </label>
                  <input
                    id="min-price"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={minPrice}
                    onChange={(e) => handlePriceChange("min", e.target.value)}
                    className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg "
                    onBlur={closeSidebarOnMobile}
                  />
                </div>
                <div>
                  <label
                    htmlFor="max-price"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Max Price
                  </label>
                  <input
                    id="max-price"
                    type="number"
                    placeholder="∞"
                    min="0"
                    step="0.01"
                    value={maxPrice}
                    onChange={(e) => handlePriceChange("max", e.target.value)}
                    className="w-full px-3 py-2  text-black border border-gray-300 rounded-lg"
                    onBlur={closeSidebarOnMobile}
                  />
                </div>
              </div>
            </div>

            {/* Campus Filter */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Campus
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {CAMPUS_LIST.map((campus) => (
                  <button
                    key={campus}
                    onClick={() => handleCampusSelect(campus)}
                    className={`
                    w-full p-2 rounded-lg text-left text-sm transition-colors cursor-pointer
                    ${
                      selectedCampus === campus
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50 text-gray-600"
                    }
                  `}
                    title={campus}
                  >
                    <span className="truncate block">{campus}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Smartphone,
  Sofa,
  Shirt,
  BookOpen,
  Trophy,
  Car,
  Home,
  Package,
  Filter,
  X,
} from "lucide-react";
import { Category } from "../lib/types";

interface MobileSidebarSearchProps {
  categories: Category[];
  onSearch: (query: string) => void;
  onCategoryChange: (categoryId: string) => void;
  selectedCategory: string;
}

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  switch (name) {
    case "electronics":
      return <Smartphone className="w-5 h-5" />;
    case "furniture":
      return <Sofa className="w-5 h-5" />;
    case "clothing":
      return <Shirt className="w-5 h-5" />;
    case "books":
      return <BookOpen className="w-5 h-5" />;
    case "sports":
      return <Trophy className="w-5 h-5" />;
    case "automotive":
      return <Car className="w-5 h-5" />;
    case "home & garden":
      return <Home className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
};

export default function MobileSidebarSearch({
  categories,
  onSearch,
  onCategoryChange,
  selectedCategory,
}: MobileSidebarSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-search with debounce - only when there's a search query
  useEffect(() => {
    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query is empty
    if (searchQuery.trim() === "") {
      return;
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    // Cleanup function
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]); // Remove onSearch from dependencies

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleCategorySelect = (categoryId: string) => {
    onCategoryChange(categoryId);
    setIsFilterOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // If user clears the search, immediately show all results
    if (value.trim() === "") {
      onSearch("");
    }
  };

  return (
    <>
      {/* Mobile Search Bar */}
      <div className="lg:hidden bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Filter Button */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filter Categories</span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-full bg-white rounded-lg shadow-md p-6 sticky top-6">
        {/* Search Bar */}
        <div className="mb-6 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Search Items
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for items..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
          </form>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Categories
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onCategoryChange("")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                selectedCategory === ""
                  ? "bg-blue-500 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="font-medium">All Categories</span>
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  selectedCategory === category.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {getCategoryIcon(category.name)}
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isFilterOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] overflow-y-auto rounded-t-lg">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Filter by Category
              </h3>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => handleCategorySelect("")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  selectedCategory === ""
                    ? "bg-blue-500 text-white"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                <Package className="w-5 h-5" />
                <span className="font-medium">All Categories</span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCategory === category.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-50 text-gray-700"
                  }`}
                >
                  {getCategoryIcon(category.name)}
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

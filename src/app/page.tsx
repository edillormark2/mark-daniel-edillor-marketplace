"use client";

import { useState, useCallback, useRef } from "react";
import { useListings } from "../hooks/useListings";
import SidebarSearch from "../components/SearchBar";
import ListingGrid from "../components/ListingGrid";

export default function HomePage() {
  const { listings, categories, loading, fetchListings } = useListings();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable search function that doesn't change on every render
  const handleSearch = useCallback(
    (query: string) => {
      setCurrentSearchQuery(query);

      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

     
      fetchListings(selectedCategory || undefined, query || undefined);
    },
    [selectedCategory, fetchListings]
  );

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setSelectedCategory(categoryId);
      fetchListings(categoryId || undefined, currentSearchQuery || undefined);
    },
    [currentSearchQuery, fetchListings]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Search and Categories */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <SidebarSearch
              categories={categories}
              onSearch={handleSearch}
              onCategoryChange={handleCategoryChange}
              selectedCategory={selectedCategory}
            />
          </div>

          {/* Main Content - Listings Grid */}
          <div className="flex-1 min-w-0">
            <ListingGrid listings={listings} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}

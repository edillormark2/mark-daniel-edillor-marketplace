"use client";

import { ListingWithCategory } from "../lib/types";
import ListingCard from "./ListingCard";

interface ListingGridProps {
  listings: ListingWithCategory[];
  loading: boolean;
}

export default function ListingGrid({ listings, loading }: ListingGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="h-48 bg-gray-200 animate-pulse"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">🔍</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No listings found
        </h3>
        <p className="text-gray-500">
          Try adjusting your search or browse different categories
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="font-semibold text-2xl text-black">Today's picks</div>
      <div className="w-full border-t  border-gray-300"></div>
      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">
          {listings.length} {listings.length === 1 ? "Item" : "Items"} Found
        </h2>
        <div className="text-sm text-gray-500">Showing latest results</div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}

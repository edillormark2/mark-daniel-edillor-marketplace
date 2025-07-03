"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ListingWithCategory } from "../lib/types";
import { formatPrice, formatDate } from "../lib/utils";

interface ListingCardProps {
  listing: ListingWithCategory;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Link href={`/listing/${listing.id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <div className="relative h-48 bg-gray-200">
          {listing.image_url && !imageError ? (
            <Image
              src={listing.image_url}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={handleImageError}
              unoptimized // This bypasses Next.js image optimization as a fallback
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <p className="text-sm">No Image</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-black">
            {listing.title}
          </h3>
          <p className="text-2xl font-bold text-green-600 mb-2">
            {formatPrice(listing.price)}
          </p>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {listing.description || "No description available"}
          </p>

          <div className="flex justify-between items-center text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              {listing.categories?.name || "Uncategorized"}
            </span>
            <span>{formatDate(listing.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// src/components/PostCard.tsx
"use client";

import { useState } from "react";
import { Post } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils";
import { MapPin, Calendar } from "lucide-react";
import Link from "next/link";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/post/${post.id}`} // Changed from /posts/ to /post/
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      <div
        className={`bg-white rounded-lg max-w-[90%] md:max-w-[18rem] shadow-sm border border-gray-200 transition-all h-full flex flex-col ${
          isHovered ? "shadow-md" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Photo */}
        <div className="aspect-square bg-gray-200 rounded-t-lg overflow-hidden relative">
          {post.photos && post.photos.length > 0 ? (
            <img
              src={post.photos[0]}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {post.title}
            </h3>
            {post.price && (
              <span className="text-green-600 font-bold text-lg ml-2">
                {formatPrice(post.price)}
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {post.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {post.main_category}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
              {post.sub_category}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="truncate">{post.campus}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

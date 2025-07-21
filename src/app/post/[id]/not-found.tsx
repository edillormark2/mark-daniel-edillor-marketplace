// src/app/post/[id]/not-found.tsx
"use client";

import Header from "@/components/ui/Header";
import { useRouter } from "next/navigation";

export default function PostNotFound() {
  const router = useRouter();

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center pt-16 bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Post not found
          </h2>
          <p className="text-gray-600 mb-6">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </>
  );
}

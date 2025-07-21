// src/app/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Post } from "@/lib/types";
import { PostService, PostFilters } from "@/lib/posts";
import Loading from "@/components/ui/Loading";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/ui/Sidebar";
import Header from "@/components/ui/Header";
import { FileText, TextSearch } from "lucide-react";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<PostFilters>({});

  // Load all posts initially
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await PostService.getPosts();
        if (error) {
          setError(error);
        } else {
          setPosts(data);
          setFilteredPosts(data);
        }
      } catch (err) {
        setError("Failed to load posts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback(async (filters: PostFilters) => {
    setCurrentFilters(filters);
    setIsFiltering(true);

    try {
      const { data, error } = await PostService.getPosts(filters);
      if (error) {
        setError(error);
      } else {
        setFilteredPosts(data);
      }
    } catch (err) {
      setError("Failed to filter posts");
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // Handle post card click
  const handleCardClick = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Auto-close sidebar on mobile when clicking outside or when screen size changes
  useEffect(() => {
    const handleResize = () => {
      // Close sidebar on mobile when screen gets smaller
      if (window.innerWidth < 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  // Check if there are active filters
  const hasActiveFilters =
    Object.keys(currentFilters).length > 0 &&
    Object.values(currentFilters).some(
      (value) => value !== undefined && value !== ""
    );

  // Handle retry
  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <>
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          showSidebarToggle={true}
        />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <Loading text="Loading posts..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          showSidebarToggle={true}
        />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header with sidebar toggle */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        showSidebarToggle={true}
      />

      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="flex">
          {/* Sidebar */}
          <Sidebar
            onFiltersChange={handleFiltersChange}
            isOpen={isSidebarOpen}
            onToggle={toggleSidebar}
          />

          {/* Main Content */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out ${
              isSidebarOpen ? "lg:ml-80" : "lg:ml-0"
            }`}
          >
            {/* Centered Container with Margins */}

            <div className="flex flex-col max-w-[85%] mx-auto ">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Campus Marketplace
                </h1>
                <p className="text-gray-600">
                  Discover and share items, services, and opportunities in your
                  campus community
                </p>

                {/* Filter Summary */}
                {hasActiveFilters && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentFilters.search && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        Search: "{currentFilters.search}"
                      </span>
                    )}
                    {currentFilters.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        Category: {currentFilters.category}
                      </span>
                    )}
                    {currentFilters.subcategory && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                        Subcategory: {currentFilters.subcategory}
                      </span>
                    )}
                    {currentFilters.campus && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                        Campus: {currentFilters.campus}
                      </span>
                    )}
                    {(currentFilters.minPrice || currentFilters.maxPrice) && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                        Price: ${currentFilters.minPrice || 0} - $
                        {currentFilters.maxPrice || "∞"}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Loading State for Filtering */}
              {isFiltering && (
                <div className="flex justify-center mb-8">
                  <Loading text="Filtering posts..." />
                </div>
              )}

              {/* Posts Grid */}
              {!isFiltering && (
                <>
                  {filteredPosts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">
                        {hasActiveFilters ? (
                          <TextSearch className="w-16 h-16 text-gray-400 mx-auto" />
                        ) : (
                          <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                        )}
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        {hasActiveFilters ? "No posts found" : "No posts yet"}
                      </h2>
                      <p className="text-gray-600 mb-6">
                        {hasActiveFilters
                          ? "Try adjusting your filters to see more results."
                          : "Be the first to create a post in your campus marketplace!"}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {hasActiveFilters && (
                          <button
                            onClick={() => handleFiltersChange({})}
                            className="px-6 py-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 font-medium transition-colors cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                        <button
                          onClick={() =>
                            (window.location.href = "/create-post")
                          }
                          className="px-6 py-3 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/40 font-medium cursor-pointer"
                        >
                          Create Post
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Results Count */}
                      <div className="mb-6 flex justify-between items-center">
                        <p className="text-gray-600">
                          {filteredPosts.length}{" "}
                          {filteredPosts.length === 1 ? "post" : "posts"} found
                          {hasActiveFilters && (
                            <span className="text-blue-600 ml-2">
                              (filtered from {posts.length} total)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Posts Grid - Centered and Responsive */}
                      <div className="flex flex-wrap gap-4">
                        {filteredPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onCardClick={handleCardClick}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

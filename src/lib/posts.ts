// src/lib/posts.ts
import { supabase } from "./supabase";
import { Post, PostFormData } from "./types";

export interface CreatePostData {
  title: string;
  description: string;
  price?: number;
  main_category: string;
  sub_category: string;
  campus: string;
  photos: string[];
  seller_id: string;
  seller_name: string;
  seller_email: string;
}

export interface PostFilters {
  category?: string;
  subcategory?: string;
  campus?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export class PostService {
  // Create a new post
  static async createPost(
    data: CreatePostData
  ): Promise<{ data: Post | null; error: string | null }> {
    try {
      const { data: post, error } = await supabase
        .from("posts")
        .insert(data)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: post, error: null };
    } catch (error) {
      return { data: null, error: "Failed to create post" };
    }
  }

  // Get all posts with optional filters
  static async getPosts(
    filters: PostFilters = {}
  ): Promise<{ data: Post[]; error: string | null }> {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.category) {
        query = query.eq("main_category", filters.category);
      }

      if (filters.subcategory) {
        query = query.eq("sub_category", filters.subcategory);
      }

      if (filters.campus) {
        query = query.eq("campus", filters.campus);
      }

      if (filters.minPrice) {
        query = query.gte("price", filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice);
      }

      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: "Failed to fetch posts" };
    }
  }

  // Get a single post by ID
  static async getPost(
    id: string
  ): Promise<{ data: Post | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: "Failed to fetch post" };
    }
  }

  // Get posts by seller ID
  static async getPostsBySeller(
    sellerId: string
  ): Promise<{ data: Post[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: "Failed to fetch seller posts" };
    }
  }

  // Update a post
  static async updatePost(
    id: string,
    updates: Partial<CreatePostData>
  ): Promise<{ data: Post | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: "Failed to update post" };
    }
  }

  // Delete a post
  static async deletePost(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: "Failed to delete post" };
    }
  }

  // Upload photos to Supabase Storage
  static async uploadPhotos(
    photos: File[],
    userId: string
  ): Promise<{ urls: string[]; error: string | null }> {
    try {
      const uploadPromises = photos.map(async (photo, index) => {
        const fileName = `${userId}_${Date.now()}_${index}.${photo.name
          .split(".")
          .pop()}`;

        const { error: uploadError } = await supabase.storage
          .from("post-photos")
          .upload(fileName, photo, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("post-photos")
          .getPublicUrl(fileName);

        return data.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      return { urls, error: null };
    } catch (error) {
      return { urls: [], error: "Failed to upload photos" };
    }
  }

  // Delete photos from Supabase Storage
  static async deletePhotos(
    photoUrls: string[]
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const filePaths = photoUrls.map((url) => {
        const urlParts = url.split("/");
        return urlParts[urlParts.length - 1];
      });

      const { error } = await supabase.storage
        .from("post-photos")
        .remove(filePaths);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: "Failed to delete photos" };
    }
  }

  // Get posts count by category
  static async getPostsCountByCategory(): Promise<{
    data: Record<string, number>;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("main_category")
        .not("main_category", "is", null);

      if (error) {
        return { data: {}, error: error.message };
      }

      const counts = data.reduce((acc, post) => {
        acc[post.main_category] = (acc[post.main_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { data: counts, error: null };
    } catch (error) {
      return { data: {}, error: "Failed to get category counts" };
    }
  }
  static async getPostsByCategory(category: string, limit = 5) {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("main_category", category)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch posts",
      };
    }
  }

  static async getRecentPosts(limit = 5) {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return {
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch posts",
      };
    }
  }

  // Search posts
  static async searchPosts(
    query: string,
    filters: PostFilters = {}
  ): Promise<{ data: Post[]; error: string | null }> {
    return this.getPosts({
      ...filters,
      search: query,
    });
  }
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ListingWithCategory, Category } from "../lib/types";

export const useListings = () => {
  const [listings, setListings] = useState<ListingWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = async (categoryId?: string, searchQuery?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from("listings")
        .select(
          `
          *,
          categories (
            id,
            name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setListings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setCategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  useEffect(() => {
    fetchListings();
    fetchCategories();
  }, []);

  return {
    listings,
    categories,
    loading,
    error,
    fetchListings,
    fetchCategories,
  };
};

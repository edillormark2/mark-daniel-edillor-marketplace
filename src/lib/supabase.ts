// src/lib/supabase.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (for browser usage)
export const supabase = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseKey
);

// Client creator (for browser usage)
export const createClient = () => {
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
};

// Helper to get user session (client-side)
export const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

// Helper to get user profile (client-side)
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
};

// Server-side utilities (separate file)
// Create a new file at src/lib/supabase-server.ts

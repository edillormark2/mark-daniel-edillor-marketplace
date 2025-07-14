// src/lib/server.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "./types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createClient = (token?: string) => {
  if (token) {
    // Create client with token from auth header
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
  }

  // Default to cookie-based auth
  return createServerComponentClient<Database>({ cookies });
};

// Add this new function for server-side operations
export const createServiceClient = () => {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // You need to add this to your .env.local
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// src/lib/server.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";

export const createClient = (token?: string) => {
  if (token) {
    // Create client with token from auth header
    return new SupabaseClient<Database>(
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

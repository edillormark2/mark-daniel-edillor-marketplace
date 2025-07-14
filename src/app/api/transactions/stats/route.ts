// src/app/api/transactions/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { getSellerStats } from "@/lib/payments";

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Create client with token if provided
    const supabase = createClient(token);

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get seller stats
    const stats = await getSellerStats(user.id);

    if (!stats) {
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching seller stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch seller stats" },
      { status: 500 }
    );
  }
}

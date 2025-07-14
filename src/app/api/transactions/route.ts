// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { getUserTransactions } from "@/lib/payments";

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const role =
      (searchParams.get("role") as "buyer" | "seller" | "both") || "both";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get transactions
    const transactions = await getUserTransactions(
      user.id,
      role,
      limit,
      offset
    );

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}


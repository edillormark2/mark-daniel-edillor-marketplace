// src/app/api/stripe/connect/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { updateAccountStatus, createDashboardLink } from "@/lib/stripe/connect";

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

    // Get seller account
    const { data: sellerAccount, error } = await supabase
      .from("seller_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !sellerAccount) {
      return NextResponse.json(
        { error: "Seller account not found" },
        { status: 404 }
      );
    }

    if (!sellerAccount.stripe_account_id) {
      return NextResponse.json(
        { error: "Stripe account not configured" },
        { status: 400 }
      );
    }

    // Update and get account status
    const status = await updateAccountStatus(sellerAccount.stripe_account_id);

    return NextResponse.json({
      accountId: sellerAccount.stripe_account_id,
      ...status,
    });
  } catch (error) {
    console.error("Account status error:", error);
    return NextResponse.json(
      { error: "Failed to get account status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

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

    // Get seller account
    const { data: sellerAccount, error } = await supabase
      .from("seller_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !sellerAccount || !sellerAccount.stripe_account_id) {
      return NextResponse.json(
        { error: "Seller account not found" },
        { status: 404 }
      );
    }

    if (action === "dashboard") {
      // Create Express dashboard link
      const dashboardUrl = await createDashboardLink(
        sellerAccount.stripe_account_id
      );

      return NextResponse.json({ url: dashboardUrl });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Account action error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}

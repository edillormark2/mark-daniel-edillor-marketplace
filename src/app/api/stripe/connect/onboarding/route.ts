// src/app/api/stripe/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import {
  getOrCreateSellerAccount,
  createOnboardingLink,
} from "@/lib/stripe/connect";

export async function POST(request: NextRequest) {
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

    // Get or create seller account
    const sellerAccount = await getOrCreateSellerAccount(user.id, user.email!);

    if (!sellerAccount || !sellerAccount.stripe_account_id) {
      return NextResponse.json(
        { error: "Failed to create seller account" },
        { status: 500 }
      );
    }

    // Generate onboarding URL
    const baseUrl = request.headers.get("origin") || "";
    const refreshUrl = `${baseUrl}/seller/onboarding`;
    const returnUrl = `${baseUrl}/seller/dashboard`;

    const onboardingUrl = await createOnboardingLink(
      sellerAccount.stripe_account_id,
      refreshUrl,
      returnUrl
    );

    return NextResponse.json({
      url: onboardingUrl,
      accountId: sellerAccount.stripe_account_id,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}

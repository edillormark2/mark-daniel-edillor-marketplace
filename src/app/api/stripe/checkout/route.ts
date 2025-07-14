// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { createTransaction } from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

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
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if buyer is trying to buy their own item
    if (post.seller_id === user.id) {
      return NextResponse.json(
        { error: "You cannot purchase your own item" },
        { status: 400 }
      );
    }

    // Check if seller has Stripe account
    if (!post.seller_stripe_account_id) {
      // Get seller account to check if they need onboarding
      const { data: sellerAccount } = await supabase
        .from("seller_accounts")
        .select("*")
        .eq("user_id", post.seller_id)
        .single();

      if (!sellerAccount?.stripe_account_id || !sellerAccount.charges_enabled) {
        return NextResponse.json(
          { error: "Seller has not completed payment setup" },
          { status: 400 }
        );
      }

      // Update post with seller's stripe account
      await supabase
        .from("posts")
        .update({ seller_stripe_account_id: sellerAccount.stripe_account_id })
        .eq("id", postId);

      post.seller_stripe_account_id = sellerAccount.stripe_account_id;
    }

    // Create checkout session
    const baseUrl = request.headers.get("origin") || "";
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/?canceled=true`;

    const session = await createCheckoutSession(
      post,
      user.id,
      successUrl,
      cancelUrl
    );

    // Don't create transaction here - let the webhook handle it
    // The session might not have a payment_intent immediately
    console.log("Checkout session created:", session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

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

    // Import here to avoid circular dependency
    const { retrieveCheckoutSession } = await import("@/lib/stripe/checkout");
    const session = await retrieveCheckoutSession(sessionId);

    // Verify the buyer matches
    if (session.metadata?.buyer_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      status: session.payment_status,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total,
    });
  } catch (error) {
    console.error("Session retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

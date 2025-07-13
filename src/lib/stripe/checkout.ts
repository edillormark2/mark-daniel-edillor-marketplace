// src/lib/stripe/checkout.ts
import { stripe, calculatePlatformFee, calculateSellerAmount } from "./client";
import { createClient } from "@/lib/supabase";
import { PostWithStripe } from "@/lib/types";
import Stripe from "stripe";

/**
 * Create a Stripe product and price for a post
 */
export async function createStripeProduct(
  post: PostWithStripe,
  sellerStripeAccountId: string
): Promise<{ productId: string; priceId: string }> {
  try {
    // Create product on the platform account
    const product = await stripe.products.create({
      name: post.title,
      description: post.description || undefined,
      images: post.photos?.slice(0, 8), // Stripe accepts max 8 images
      metadata: {
        post_id: post.id,
        seller_id: post.seller_id,
        seller_account_id: sellerStripeAccountId,
      },
    });

    // Create price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round((post.price || 0) * 100), // Convert to cents
      currency: "usd",
      metadata: {
        post_id: post.id,
      },
    });

    // Update post with Stripe IDs
    const supabase = createClient();
    await supabase
      .from("posts")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        seller_stripe_account_id: sellerStripeAccountId,
      })
      .eq("id", post.id);

    return { productId: product.id, priceId: price.id };
  } catch (error) {
    console.error("Error creating Stripe product:", error);
    throw error;
  }
}

/**
 * Create a checkout session for a post purchase
 */
export async function createCheckoutSession(
  post: PostWithStripe,
  buyerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    const supabase = createClient();

    // Ensure seller has a connected account
    if (!post.seller_stripe_account_id) {
      throw new Error("Seller has not completed Stripe onboarding");
    }

    // Check if seller account is active
    const { data: sellerAccount } = await supabase
      .from("seller_accounts")
      .select("charges_enabled")
      .eq("stripe_account_id", post.seller_stripe_account_id)
      .single();

    if (!sellerAccount?.charges_enabled) {
      throw new Error("Seller account is not active for receiving payments");
    }

    // Create product and price if not exists
    let priceId = post.stripe_price_id;
    if (!priceId) {
      const { priceId: newPriceId } = await createStripeProduct(
        post,
        post.seller_stripe_account_id
      );
      priceId = newPriceId;
    }

    const amount = Math.round((post.price || 0) * 100);
    const platformFee = calculatePlatformFee(amount);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId!,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: post.seller_stripe_account_id,
        },
        metadata: {
          post_id: post.id,
          buyer_id: buyerId,
          seller_id: post.seller_id,
        },
      },
      metadata: {
        post_id: post.id,
        buyer_id: buyerId,
        seller_id: post.seller_id,
        platform_fee: platformFee.toString(),
      },
    });

    return session;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

/**
 * Retrieve a checkout session
 */
export async function retrieveCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "payment_intent.charges"],
    });
    return session;
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    throw error;
  }
}

/**
 * Create a refund for a transaction
 */
export async function createRefund(
  chargeId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount, // Optional: partial refund amount in cents
      reason:
        (reason as Stripe.RefundCreateParams.Reason) || "requested_by_customer",
    });

    return refund;
  } catch (error) {
    console.error("Error creating refund:", error);
    throw error;
  }
}

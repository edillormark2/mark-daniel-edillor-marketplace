// src/app/api/stripe/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";
import {
  updateTransactionStatus,
  createTransaction,
  getTransactionByPaymentIntent,
  isWebhookProcessed,
  recordWebhookEvent,
} from "@/lib/payments";
import { updateAccountStatus } from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Check for duplicate processing
  const processed = await isWebhookProcessed(event.id);
  if (processed) {
    console.log(`Webhook ${event.id} already processed`);
    return NextResponse.json({ received: true });
  }

  try {
    // Record the webhook event
    await recordWebhookEvent(event.id, event.type, event.data, false);

    // Handle different event types
    switch (event.type) {
      // ADD THIS CASE - IT'S MISSING IN YOUR CODE!
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeSucceeded(charge);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case "payout.created":
      case "payout.updated":
      case "payout.paid":
      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutEvent(payout, event.type);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await recordWebhookEvent(event.id, event.type, event.data, true);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);

    // Record error
    await recordWebhookEvent(
      event.id,
      event.type,
      event.data,
      false,
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handler for checkout session completed
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("Checkout session completed:", session.id);

  if (!session.payment_intent) {
    console.error("No payment intent in session");
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

  // Check if transaction already exists
  const existingTransaction = await getTransactionByPaymentIntent(
    paymentIntentId
  );
  if (existingTransaction) {
    console.log(
      "Transaction already exists for payment intent:",
      paymentIntentId
    );
    return;
  }

  // Create transaction from session metadata
  const metadata = session.metadata || {};

  if (!metadata.post_id || !metadata.buyer_id || !metadata.seller_id) {
    console.error("Missing required metadata in session:", metadata);
    return;
  }

  // Get the seller's stripe account ID from the payment intent
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const sellerAccountId = paymentIntent.transfer_data?.destination as string;

  if (!sellerAccountId) {
    console.error("No seller account ID in payment intent");
    return;
  }

  // Create the transaction
  const transaction = await createTransaction({
    stripe_payment_intent_id: paymentIntentId,
    post_id: metadata.post_id,
    buyer_id: metadata.buyer_id,
    seller_id: metadata.seller_id,
    seller_stripe_account_id: sellerAccountId,
    amount: session.amount_total || 0,
    currency: session.currency || "usd",
    status: "processing",
    metadata: {
      session_id: session.id,
      customer_email: session.customer_email,
      payment_method_type: session.payment_method_types?.[0],
    },
  });

  if (transaction) {
    console.log("Transaction created successfully:", transaction.id);
  } else {
    console.error("Failed to create transaction for session:", session.id);
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  console.log("Payment intent succeeded:", paymentIntent.id);

  const transaction = await getTransactionByPaymentIntent(paymentIntent.id);
  if (!transaction) {
    console.error(
      "Transaction not found for payment intent:",
      paymentIntent.id
    );
    return;
  }

  await updateTransactionStatus(transaction.id, "succeeded", {
    stripe_charge_id: paymentIntent.latest_charge as string,
    payment_method_type: paymentIntent.payment_method_types[0],
    metadata: {
      payment_method: paymentIntent.payment_method_types[0],
      processed_at: new Date().toISOString(),
    },
  });

  console.log("Transaction status updated to succeeded:", transaction.id);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("Payment intent failed:", paymentIntent.id);

  const transaction = await getTransactionByPaymentIntent(paymentIntent.id);
  if (!transaction) {
    console.error(
      "Transaction not found for payment intent:",
      paymentIntent.id
    );
    return;
  }

  await updateTransactionStatus(transaction.id, "failed", {
    metadata: {
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
      failed_at: new Date().toISOString(),
    },
  });
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log("Charge succeeded:", charge.id);

  if (!charge.payment_intent) return;

  const transaction = await getTransactionByPaymentIntent(
    charge.payment_intent as string
  );
  if (!transaction) return;

  await updateTransactionStatus(transaction.id, "succeeded", {
    stripe_charge_id: charge.id,
    stripe_transfer_id: (charge.transfer as string) || undefined,
    payment_method_type: charge.payment_method_details?.type,
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log("Charge refunded:", charge.id);

  if (!charge.payment_intent) return;

  const transaction = await getTransactionByPaymentIntent(
    charge.payment_intent as string
  );
  if (!transaction) return;

  const refundAmount = charge.amount_refunded;
  const isFullRefund = refundAmount === charge.amount;

  await updateTransactionStatus(transaction.id, "refunded", {
    metadata: {
      refunded_amount: refundAmount,
      is_full_refund: isFullRefund,
      refunded_at: new Date().toISOString(),
    },
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log("Account updated:", account.id);

  // Update account status in database
  await updateAccountStatus(account.id);
}

async function handlePayoutEvent(payout: Stripe.Payout, eventType: string) {
  console.log(`Payout event ${eventType}:`, payout.id);

  const supabase = createClient();

  // Map Stripe payout status to our status
  let status: string;
  switch (payout.status) {
    case "pending":
      status = "pending";
      break;
    case "in_transit":
      status = "in_transit";
      break;
    case "paid":
      status = "paid";
      break;
    case "failed":
      status = "failed";
      break;
    case "canceled":
      status = "canceled";
      break;
    default:
      status = payout.status;
  }

  // Get the connected account ID
  const stripeAccountId = payout.destination as string;

  // Get seller ID from account
  const { data: sellerAccount } = await supabase
    .from("seller_accounts")
    .select("user_id")
    .eq("stripe_account_id", stripeAccountId)
    .single();

  if (!sellerAccount) {
    console.error("Seller account not found for payout:", stripeAccountId);
    return;
  }

  // Upsert payout record
  await supabase.from("payouts").upsert({
    stripe_payout_id: payout.id,
    seller_id: sellerAccount.user_id,
    stripe_account_id: stripeAccountId,
    amount: payout.amount,
    currency: payout.currency,
    status,
    arrival_date: payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString()
      : null,
  });
}

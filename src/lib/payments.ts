// src/lib/payments.ts
import { createClient } from "@/lib/supabase";
import { createServiceClient } from "@/lib/server";
import {
  Transaction,
  TransactionStatus,
  TransactionWithDetails,
} from "@/lib/types";
import {
  calculatePlatformFee,
  calculateSellerAmount,
} from "@/lib/stripe/client";

/**
 * Create a new transaction record
 */
export async function createTransaction(data: {
  stripe_payment_intent_id: string;
  post_id: string;
  buyer_id: string;
  seller_id: string;
  seller_stripe_account_id: string;
  amount: number; // in cents
  currency?: string;
  status?: TransactionStatus;
  metadata?: Record<string, any>;
}): Promise<Transaction | null> {
  // Use service client for server-side operations
  const supabase = createServiceClient();

  const platformFee = calculatePlatformFee(data.amount);
  const sellerAmount = calculateSellerAmount(data.amount);

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      ...data,
      currency: data.currency || "usd",
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      status: data.status || "pending",
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    return null;
  }

  // Log initial status
  await logTransactionStatus(transaction.id, transaction.status);

  return transaction;
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  updates?: {
    stripe_charge_id?: string;
    stripe_transfer_id?: string;
    payment_method_type?: string;
    metadata?: Record<string, any>;
  }
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("transactions")
    .update({
      status,
      ...updates,
    })
    .eq("id", transactionId);

  if (error) {
    console.error("Error updating transaction:", error);
    return false;
  }

  // Log status change
  await logTransactionStatus(transactionId, status, updates?.metadata);

  return true;
}

/**
 * Log transaction status history
 */
export async function logTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  metadata?: Record<string, any>,
  reason?: string
): Promise<void> {
  const supabase = createClient();

  await supabase.from("transaction_status_history").insert({
    transaction_id: transactionId,
    status,
    reason,
    metadata: metadata || {},
  });
}

/**
 * Get transaction by payment intent ID
 */
export async function getTransactionByPaymentIntent(
  paymentIntentId: string
): Promise<Transaction | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }

  return data;
}

/**
 * Get transactions for a user (as buyer or seller)
 */
export async function getUserTransactions(
  userId: string,
  role: "buyer" | "seller" | "both" = "both",
  limit = 20,
  offset = 0
): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from("transaction_summary")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (role === "buyer") {
    query = query.eq("buyer_id", userId);
  } else if (role === "seller") {
    query = query.eq("seller_id", userId);
  } else {
    query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user transactions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get transaction details with related data
 */
export async function getTransactionDetails(
  transactionId: string
): Promise<TransactionWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transaction_summary")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error) {
    console.error("Error fetching transaction details:", error);
    return null;
  }

  return data;
}

/**
 * Get transaction statistics for a seller
 */
export async function getSellerStats(sellerId: string): Promise<{
  total_sales: number;
  total_earnings: number;
  total_platform_fees: number;
  transaction_count: number;
} | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, seller_amount, platform_fee")
    .eq("seller_id", sellerId)
    .eq("status", "succeeded");

  if (error) {
    console.error("Error fetching seller stats:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return {
      total_sales: 0,
      total_earnings: 0,
      total_platform_fees: 0,
      transaction_count: 0,
    };
  }

  const stats = data.reduce(
    (acc, transaction) => {
      acc.total_sales += transaction.amount;
      acc.total_earnings += transaction.seller_amount;
      acc.total_platform_fees += transaction.platform_fee;
      acc.transaction_count += 1;
      return acc;
    },
    {
      total_sales: 0,
      total_earnings: 0,
      total_platform_fees: 0,
      transaction_count: 0,
    }
  );

  return stats;
}

/**
 * Check if a webhook event has been processed
 */
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const supabase = createClient();

  const { data } = await supabase
    .from("webhook_events")
    .select("processed")
    .eq("stripe_event_id", eventId)
    .single();

  return data?.processed || false;
}

/**
 * Record a webhook event
 */
export async function recordWebhookEvent(
  eventId: string,
  type: string,
  payload: any,
  processed = false,
  error?: string
): Promise<void> {
  const supabase = createClient();

  await supabase.from("webhook_events").upsert({
    stripe_event_id: eventId,
    type,
    payload,
    processed,
    error,
  });
}

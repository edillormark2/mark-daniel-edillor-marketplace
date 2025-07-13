// src/lib/stripe/connect.ts
import { stripe } from "./client";
import { createClient } from "@/lib/server";
import { SellerAccount } from "@/lib/types";

/**
 * Create a new Stripe Connect account for a seller
 */
export async function createConnectAccount(
  userId: string,
  email: string
): Promise<string> {
  try {
    // Create the Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        user_id: userId,
      },
    });

    // Store in database
    const supabase = createClient();
    const { error } = await supabase.from("seller_accounts").insert({
      user_id: userId,
      stripe_account_id: account.id,
      onboarding_completed: false,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    });

    if (error) {
      // Cleanup: Delete the Stripe account if database insert fails
      await stripe.accounts.del(account.id);
      throw error;
    }

    return account.id;
  } catch (error) {
    console.error("Error creating Connect account:", error);
    throw error;
  }
}

/**
 * Generate onboarding link for Stripe Connect
 */
export async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return accountLink.url;
  } catch (error) {
    console.error("Error creating onboarding link:", error);
    throw error;
  }
}

/**
 * Check account status and update database
 */
export async function updateAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  requirements?: any;
}> {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      requiresAction: !account.charges_enabled || !account.details_submitted,
      requirements: account.requirements,
    };

    // Update database
    const supabase = createClient();
    const { error } = await supabase
      .from("seller_accounts")
      .update({
        charges_enabled: status.chargesEnabled,
        payouts_enabled: status.payoutsEnabled,
        details_submitted: status.detailsSubmitted,
        onboarding_completed: status.chargesEnabled && status.detailsSubmitted,
      })
      .eq("stripe_account_id", accountId);

    if (error) {
      console.error("Error updating account status:", error);
    }

    return status;
  } catch (error) {
    console.error("Error retrieving account status:", error);
    throw error;
  }
}

/**
 * Get or create seller's Stripe account
 */
export async function getOrCreateSellerAccount(
  userId: string,
  email: string
): Promise<SellerAccount | null> {
  const supabase = createClient();

  // Check if seller account exists
  const { data: existingAccount, error: fetchError } = await supabase
    .from("seller_accounts")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error fetching seller account:", fetchError);
    return null;
  }

  if (existingAccount) {
    return existingAccount;
  }

  // Create new account
  try {
    const accountId = await createConnectAccount(userId, email);

    const { data: newAccount, error: selectError } = await supabase
      .from("seller_accounts")
      .select("*")
      .eq("stripe_account_id", accountId)
      .single();

    if (selectError) {
      console.error("Error fetching new account:", selectError);
      return null;
    }

    return newAccount;
  } catch (error) {
    console.error("Error in getOrCreateSellerAccount:", error);
    return null;
  }
}

/**
 * Create a login link for Express dashboard
 */
export async function createDashboardLink(accountId: string): Promise<string> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error("Error creating dashboard link:", error);
    throw error;
  }
}

// src/lib/stripe/client.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});

// Platform configuration
export const PLATFORM_FEE_PERCENTAGE = 50; // 10% platform fee

// Helper to calculate platform fee
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENTAGE / 100));
}

// Helper to calculate seller amount after fee
export function calculateSellerAmount(amount: number): number {
  return amount - calculatePlatformFee(amount);
}

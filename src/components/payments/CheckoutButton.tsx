// src/components/payments/CheckoutButton.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, AlertCircle } from "lucide-react";
import { PostWithStripe } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface CheckoutButtonProps {
  post: PostWithStripe;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export default function CheckoutButton({
  post,
  className = "",
  size = "md",
  fullWidth = false,
}: CheckoutButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    // Check authentication
    if (!user) {
      router.push(`/auth?redirect=/post/${post.id}`);
      return;
    }

    // Prevent self-purchase
    if (user.id === post.seller_id) {
      setError("You cannot purchase your own item");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the current session to get the access token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({
          postId: post.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? "w-full" : ""}
    ${sizeClasses[size]}
  `;

  const variants = {
    primary: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const variant = error ? "danger" : "primary";

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="ml-2 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading || !post.price}
        className={`${baseClasses} ${variants[variant]} ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5 mr-2" />
            Buy Now
          </>
        )}
      </button>
    </div>
  );
}

// src/app/checkout/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface PurchaseDetails {
  post_title: string;
  post_image: string;
  amount: number;
  seller_email: string;
  payment_intent_id: string;
  created_at: string;
}

export default function CheckoutSuccessPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // First check if we already have the transaction in our database
        const { data: transaction, error: transactionError } = await supabase
          .from("transaction_summary")
          .select("*")
          .eq("stripe_payment_intent_id", sessionId)
          .single();

        if (transaction) {
          setPurchase({
            post_title: transaction.post_title || "Purchased Item",
            post_image: transaction.post_photos?.[0] || "",
            amount: transaction.amount,
            seller_email: transaction.seller_email || "",
            payment_intent_id: transaction.stripe_payment_intent_id,
            created_at: transaction.created_at,
          });
          setLoading(false);
          return;
        }

        // If not in our DB yet, fetch from Stripe directly
        const response = await fetch(
          `/api/stripe/checkout?session_id=${sessionId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch session details");
        }

        const session = await response.json();

        // Get post details
        const { data: post } = await supabase
          .from("posts")
          .select("*")
          .eq("id", session.metadata.post_id)
          .single();

        // Get seller details
        const { data: seller } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", session.metadata.seller_id)
          .single();

        setPurchase({
          post_title: post?.title || "Purchased Item",
          post_image: post?.photos?.[0] || "",
          amount: session.amount_total,
          seller_email: seller?.email || "",
          payment_intent_id: session.payment_intent,
          created_at: new Date().toISOString(),
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching session details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load purchase details"
        );
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white border border-green-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-green-50 p-6 border-b border-green-100">
          <div className="flex items-center">
            <CheckCircle className="h-10 w-10 text-green-600 mr-4" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Payment Successful
              </h1>
              <p className="text-green-700">Thank you for your purchase!</p>
            </div>
          </div>
        </div>

        {purchase && (
          <div className="p-6 space-y-6">
            <div className="flex items-start">
              {purchase.post_image && (
                <img
                  src={purchase.post_image}
                  alt={purchase.post_title}
                  className="w-24 h-24 object-cover rounded-lg mr-4"
                />
              )}
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {purchase.post_title}
                </h2>
                <p className="text-gray-600 mt-1">
                  Amount: {formatPrice(purchase.amount / 100)}
                </p>
                <p className="text-gray-600">Seller: {purchase.seller_email}</p>
                <p className="text-gray-600 text-sm mt-2">
                  Order ID: {purchase.payment_intent_id}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">What's next?</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>The seller will be notified of your purchase</li>
                <li>You'll receive a confirmation email with order details</li>
                <li>Contact the seller to arrange delivery or pickup</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Link
                href="/"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Continue Shopping
              </Link>
              <Link
                href="/profile"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                View Your Purchases
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

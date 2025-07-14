// src/app/seller/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { createClient } from "@/lib/supabase";
import { SellerAccount } from "@/lib/types";
import {
  ArrowLeft,
  ExternalLink,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<SellerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSellerAccount();
    }
  }, [user]);

  const fetchSellerAccount = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("seller_accounts")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error || !data) {
        // No seller account, redirect to onboarding
        router.push("/seller/onboarding");
        return;
      }

      setAccount(data);
    } catch (error) {
      console.error("Error fetching seller account:", error);
    } finally {
      setLoading(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setOpeningDashboard(true);

      const response = await fetch("/api/stripe/connect/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create dashboard link");
      }

      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error opening dashboard:", error);
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/profile"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Seller Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your sales and view transaction history
                </p>
              </div>

              {account?.charges_enabled && (
                <button
                  onClick={openStripeDashboard}
                  disabled={openingDashboard}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {openingDashboard ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Stripe Dashboard
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Account Status */}
          {account && (
            <div className="mb-8">
              {account.charges_enabled ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-green-800 font-medium">
                        Your account is active
                      </p>
                      <p className="text-green-700 text-sm mt-0.5">
                        You can receive payments from buyers
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-amber-800 font-medium">
                        Account setup incomplete
                      </p>
                      <p className="text-amber-700 text-sm mt-0.5">
                        Complete your Stripe onboarding to start receiving
                        payments
                      </p>
                      <Link
                        href="/seller/onboarding"
                        className="inline-flex items-center mt-2 text-sm text-amber-800 font-medium hover:text-amber-900"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Complete Setup
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

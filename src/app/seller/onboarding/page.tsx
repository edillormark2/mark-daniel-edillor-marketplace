// src/app/seller/onboarding/page.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import StripeOnboarding from "@/components/payments/StripeOnboarding";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SellerOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if coming back from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("return") === "true") {
      // Refresh account status
      window.location.reload();
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <Link
            href="/profile"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>

          {/* Main content */}
          <StripeOnboarding />
        </div>
      </div>
    </ProtectedRoute>
  );
}

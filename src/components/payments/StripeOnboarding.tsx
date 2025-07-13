// src/components/payments/StripeOnboarding.tsx
"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface AccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export default function StripeOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  useEffect(() => {
    if (user) {
      checkAccountStatus();
    }
  }, [user]);

  // In your StripeOnboarding.tsx component
  // src/components/payments/StripeOnboarding.tsx
  const checkAccountStatus = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      // Make sure the URL is correct
      const response = await fetch("/api/stripe/connect/account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        const status = await response.json();
        setAccountStatus(status);
      } else if (response.status === 404) {
        // Handle 404 specifically
        setAccountStatus(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to check account status");
      }
    } catch (err) {
      setError("Failed to check account status");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // In your StripeOnboarding.tsx component
  const startOnboarding = async () => {
    try {
      setIsCreatingLink(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch("/api/stripe/connect/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create onboarding link");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start onboarding"
      );
      setIsCreatingLink(false);
    }
  };

  const continueOnboarding = async () => {
    await startOnboarding();
  };

  const openDashboard = async () => {
    try {
      setIsCreatingLink(true);
      setError(null);

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
    } catch (err) {
      setError("Failed to open dashboard");
    } finally {
      setIsCreatingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-amber-800 font-medium">Sign in required</h3>
            <p className="text-amber-700 text-sm mt-1">
              Please sign in to set up your seller account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Setup</h2>
        <p className="mt-2 text-gray-600">
          Complete your Stripe account setup to start receiving payments from
          your sales.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6">
          {!accountStatus ? (
            // No account yet
            <div className="text-center py-8">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Set up your seller account
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Stripe account to receive payments directly from
                buyers. The setup process only takes a few minutes.
              </p>
              <button
                onClick={startOnboarding}
                disabled={isCreatingLink}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingLink ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Start Setup
                  </>
                )}
              </button>
            </div>
          ) : (
            // Account exists
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Account Status
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Account ID: {accountStatus.accountId}
                  </p>
                </div>
                <button
                  onClick={checkAccountStatus}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh status"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>

              {/* Status Items */}
              <div className="space-y-4">
                <StatusItem
                  label="Charges Enabled"
                  enabled={accountStatus.chargesEnabled}
                  description="Ability to accept payments from customers"
                />
                <StatusItem
                  label="Payouts Enabled"
                  enabled={accountStatus.payoutsEnabled}
                  description="Ability to receive payouts to your bank account"
                />
                <StatusItem
                  label="Details Submitted"
                  enabled={accountStatus.detailsSubmitted}
                  description="All required information has been provided"
                />
              </div>

              {/* Requirements */}
              {accountStatus.requirements &&
                (accountStatus.requirements.currently_due.length > 0 ||
                  accountStatus.requirements.past_due.length > 0) && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-900 mb-2">
                      Action Required
                    </h4>
                    {accountStatus.requirements.past_due.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-red-800 mb-1">
                          Past Due:
                        </p>
                        <ul className="text-sm text-red-700 list-disc list-inside">
                          {accountStatus.requirements.past_due.map((req) => (
                            <li key={req}>{req.replace(/_/g, " ")}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {accountStatus.requirements.currently_due.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-800 mb-1">
                          Currently Due:
                        </p>
                        <ul className="text-sm text-amber-700 list-disc list-inside">
                          {accountStatus.requirements.currently_due.map(
                            (req) => (
                              <li key={req}>{req.replace(/_/g, " ")}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                {accountStatus.requiresAction ? (
                  <button
                    onClick={continueOnboarding}
                    disabled={isCreatingLink}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingLink ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Continue Setup
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg w-full">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="ml-2 text-green-800 font-medium">
                        Your account is fully set up and ready to receive
                        payments!
                      </p>
                    </div>
                  </div>
                )}

                {accountStatus.chargesEnabled && (
                  <button
                    onClick={openDashboard}
                    disabled={isCreatingLink}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingLink ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Dashboard
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">How it works</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex">
            <span className="font-medium text-gray-900 mr-2">1.</span>
            <p>
              Complete the Stripe onboarding process to verify your identity and
              bank account.
            </p>
          </div>
          <div className="flex">
            <span className="font-medium text-gray-900 mr-2">2.</span>
            <p>
              Once approved, you can start listing items for sale on the
              marketplace.
            </p>
          </div>
          <div className="flex">
            <span className="font-medium text-gray-900 mr-2">3.</span>
            <p>
              When someone purchases your item, the payment is processed
              securely through Stripe.
            </p>
          </div>
          <div className="flex">
            <span className="font-medium text-gray-900 mr-2">4.</span>
            <p>
              Funds are automatically transferred to your bank account (minus a
              10% platform fee).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusItemProps {
  label: string;
  enabled: boolean;
  description: string;
}

function StatusItem({ label, enabled, description }: StatusItemProps) {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 mt-0.5">
        {enabled ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <div className="ml-3 flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

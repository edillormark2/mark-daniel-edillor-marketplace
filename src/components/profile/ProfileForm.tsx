"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/lib/types";
import {
  Mail,
  Phone,
  FileText,
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface StripeStatus {
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
}

// Define the ProfileFormProps interface
interface ProfileFormProps {
  profile: Profile | null;
  onUpdate: () => void;
}

export default function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [loadingStripeStatus, setLoadingStripeStatus] = useState(true);
  const [formData, setFormData] = useState({
    university: profile?.university || "",
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
  });

  useEffect(() => {
    const fetchStripeStatus = async () => {
      try {
        setLoadingStripeStatus(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        const response = await fetch("/api/stripe/connect/account", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const status = await response.json();
          setStripeStatus(status);
        } else if (response.status === 404) {
          setStripeStatus(null);
        }
      } catch (error) {
        console.error("Failed to fetch Stripe status:", error);
      } finally {
        setLoadingStripeStatus(false);
      }
    };

    fetchStripeStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile({
        ...formData,
        updated_at: new Date().toISOString(),
      });
      onUpdate();
    } catch (error) {
      // Error handled in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getStripeButtonText = () => {
    if (loadingStripeStatus) {
      return "Checking Stripe status...";
    }

    if (!stripeStatus) {
      return "Setup Your Stripe Account Now!";
    }

    if (stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled) {
      return "Stripe Account Active - View Details";
    }

    if (stripeStatus.requiresAction) {
      return "Action Required - Complete Setup";
    }

    return "Continue Stripe Setup";
  };

  const getStripeButtonIcon = () => {
    if (loadingStripeStatus) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (!stripeStatus) {
      return <CreditCard className="h-4 w-4" />;
    }

    if (stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled) {
      return <CheckCircle className="h-4 w-4" />;
    }

    if (stripeStatus.requiresAction) {
      return <AlertCircle className="h-4 w-4" />;
    }

    return <CreditCard className="h-4 w-4" />;
  };

  const getStripeButtonColor = () => {
    if (loadingStripeStatus) {
      return "bg-gray-500 hover:bg-gray-600";
    }

    if (!stripeStatus) {
      return "bg-indigo-500 hover:bg-indigo-600";
    }

    if (stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled) {
      return "bg-green-500 hover:bg-green-600";
    }

    if (stripeStatus.requiresAction) {
      return "bg-amber-500 hover:bg-amber-600";
    }

    return "bg-blue-500 hover:bg-blue-600";
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Account Information
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <Avatar
              src={profile?.avatar_url}
              name={formData.full_name || formData.university}
              email={user?.email}
              size="xl"
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {formData.full_name ||
                formData.university ||
                user?.email?.split("@")[0]}
            </h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-sm text-gray-500">
              Member since{" "}
              {new Date(profile?.created_at || "").toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* University */}
          <div>
            <label
              htmlFor="university"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              University
            </label>
            <input
              type="text"
              name="university"
              id="university"
              value={formData.university}
              onChange={handleChange}
              className="block text-black w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Your university"
            />
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              id="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="block text-black w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="John Doe"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                id="email"
                value={user?.email || ""}
                disabled
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 text-gray-500 sm:text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Bio
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <textarea
              name="bio"
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              className="block text-black w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        <Link href="/seller/onboarding">
          <div
            className={`p-3 ${getStripeButtonColor()} rounded-lg text-white cursor-pointer text-center transition-colors mb-4 flex items-center justify-center space-x-2`}
          >
            {getStripeButtonIcon()}
            <span>{getStripeButtonText()}</span>
          </div>
        </Link>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 cursor-pointer py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 cursor-pointer border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

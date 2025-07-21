// src/app/sign-in-required/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft, Plus, Users, Shield, Zap } from "lucide-react";

export default function SignInRequiredPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go back</span>
        </button>

        {/* Main content */}
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Plus className="w-10 h-10 text-blue-600" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to start selling?
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-8">
            Sign in to your account to create posts and connect with buyers on
            Campus Marketplace
          </p>

          {/* Sign in button */}
          <Link
            href="/auth"
            className="inline-flex items-center space-x-3 bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign in to create a post</span>
          </Link>

          {/* Benefits section */}
          <div className="mt-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-8">
              Why join Campus Marketplace?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Connect with students
                </h3>
                <p className="text-gray-600 text-sm">
                  Reach thousands of students on campus looking for great deals
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Safe & secure
                </h3>
                <p className="text-gray-600 text-sm">
                  Campus-only marketplace with verified student accounts
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Quick & easy
                </h3>
                <p className="text-gray-600 text-sm">
                  Create listings in minutes and start selling immediately
                </p>
              </div>
            </div>
          </div>

          {/* Alternative link */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/auth"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create one for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

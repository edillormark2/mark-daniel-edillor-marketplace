"use client";

import Link from "next/link";
import { Home, Plus, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Avatar from "@/components/ui/Avatar";
import { getUserProfile } from "@/lib/supabase";
import { Profile } from "@/lib/types";

export default function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const data = await getUserProfile(user.id);
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            <Home className="w-6 h-6" />
            <span>Capmus Marketplace</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/create-post"
                  className="flex items-center justify-center space-x-2 bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create a post</span>
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Avatar
                      src={profile?.avatar_url}
                      name={profile?.full_name || profile?.username}
                      email={user.email}
                      size="sm"
                    />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.full_name || profile?.username || "User"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        href="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setShowDropdown(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>My Profile</span>
                      </Link>
                      <hr className="my-1 border-gray-200" />

                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          signOut();
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

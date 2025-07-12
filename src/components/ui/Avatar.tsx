"use client";

import { User } from "lucide-react";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function Avatar({
  src,
  name,
  email,
  size = "md",
  className = "",
}: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl",
  };

  const getInitial = () => {
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "?";
  };

  const getBackgroundGradient = () => {
    // Generate a consistent gradient based on the name or email
    const str = name || email || "";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const gradients = [
      "bg-gradient-to-br from-red-400 to-pink-600",
      "bg-gradient-to-br from-orange-400 to-red-600",
      "bg-gradient-to-br from-amber-400 to-orange-600",
      "bg-gradient-to-br from-yellow-400 to-amber-600",
      "bg-gradient-to-br from-lime-400 to-green-600",
      "bg-gradient-to-br from-green-400 to-emerald-600",
      "bg-gradient-to-br from-emerald-400 to-teal-600",
      "bg-gradient-to-br from-teal-400 to-cyan-600",
      "bg-gradient-to-br from-cyan-400 to-blue-600",
      "bg-gradient-to-br from-sky-400 to-blue-600",
      "bg-gradient-to-br from-blue-400 to-indigo-600",
      "bg-gradient-to-br from-indigo-400 to-purple-600",
      "bg-gradient-to-br from-violet-400 to-purple-600",
      "bg-gradient-to-br from-purple-400 to-pink-600",
      "bg-gradient-to-br from-fuchsia-400 to-pink-600",
      "bg-gradient-to-br from-pink-400 to-rose-600",
      "bg-gradient-to-br from-rose-400 to-red-600",
    ];

    return gradients[Math.abs(hash) % gradients.length];
  };

  if (src) {
    return (
      <div
        className={`relative overflow-hidden rounded-full ${sizeClasses[size]} ${className}`}
      >
        <Image
          src={src}
          alt={name || "Profile"}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center justify-center rounded-full font-semibold text-white shadow-sm
        ${sizeClasses[size]} ${getBackgroundGradient()} ${className}
      `}
    >
      {getInitial()}
    </div>
  );
}

import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Loading({
  text = "Loading...",
  size = "md",
  className = "",
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} mr-2`} />
      <span className="text-gray-600">{text}</span>
    </div>
  );
}

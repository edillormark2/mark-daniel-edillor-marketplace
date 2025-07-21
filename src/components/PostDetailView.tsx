// src/components/PostDetailView.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Post } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils";
import { MessageService } from "@/lib/messages";
import { useAuth } from "@/contexts/AuthContext";
import CheckoutButton from "@/components/payments/CheckoutButton";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Share2,
  Check,
} from "lucide-react";

interface PostDetailViewProps {
  post: Post;
}

export default function PostDetailView({ post }: PostDetailViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isMessageSending, setIsMessageSending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const handleNextImage = () => {
    if (post.photos && post.photos.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === post.photos.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (post.photos && post.photos.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? post.photos.length - 1 : prev - 1
      );
    }
  };

  const handleSendMessage = async () => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthWarning(true);
      return;
    }

    // Check if user is trying to message themselves
    if (user.id === post.seller_id) {
      setMessageError("You cannot send a message to yourself.");
      return;
    }

    if (!message.trim()) {
      setMessageError("Please enter a message.");
      return;
    }

    setIsMessageSending(true);
    setMessageError(null);

    try {
      const { data, error } = await MessageService.sendMessage({
        post_id: post.id,
        recipient_id: post.seller_id,
        recipient_email: post.seller_email,
        subject: `Inquiry about: ${post.title}`,
        message: message.trim(),
        post_title: post.title,
      });

      if (error) {
        setMessageError(error);
      } else {
        setMessageSuccess(true);
        setMessage("");
        // Show success message for 5 seconds
        setTimeout(() => {
          setMessageSuccess(false);
        }, 5000);
      }
    } catch (error) {
      setMessageError("Failed to send message. Please try again.");
    } finally {
      setIsMessageSending(false);
    }
  };

  const handleAuthWarningClose = () => {
    setShowAuthWarning(false);
  };

  const handleSignInRedirect = () => {
    router.push("/auth");
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: url,
        });
      } catch (error) {
        // Fallback to clipboard
        handleCopyLink(url);
      }
    } else {
      // Fallback to clipboard
      handleCopyLink(url);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header with back button and share */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <button
            onClick={handleShare}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </button>

          {showShareSuccess && (
            <div className="absolute top-full mt-2 right-0 bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Link copied!
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Images */}
        <div className="space-y-4">
          <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
            {post.photos && post.photos.length > 0 ? (
              <>
                <img
                  src={post.photos[currentImageIndex]}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                {post.photos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-opacity"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-opacity"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {post.photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentImageIndex
                              ? "bg-white"
                              : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image Available
              </div>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {post.photos && post.photos.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {post.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex
                      ? "border-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={photo}
                    alt={`${post.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Title and Categories */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {post.main_category}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                {post.sub_category}
              </span>
            </div>

            {post.price && (
              <div className="text-4xl font-bold text-green-600 mb-4">
                {formatPrice(post.price)}
              </div>
            )}

            {/* Buy Now Button */}
            <div className="mb-6">
              <CheckoutButton post={post} size="lg" fullWidth />
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Description
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {post.description}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3 py-4 border-t border-gray-200">
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-3" />
              <span>{post.campus}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-5 w-5 mr-3" />
              <span>Posted {formatDate(post.created_at)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <User className="h-5 w-5 mr-3" />
              <span>By {post.seller_name}</span>
            </div>
          </div>

          {/* Message Section */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Contact Seller
            </h2>

            {/* Auth Warning */}
            {showAuthWarning && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-amber-800 font-medium">
                      Sign in required
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      You need to sign in before you can send a message to the
                      seller.
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={handleSignInRedirect}
                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={handleAuthWarningClose}
                        className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {messageSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  Message sent successfully!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  The seller will receive your message via email and can reply
                  directly.
                </p>
              </div>
            )}

            {/* Error Message */}
            {messageError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">{messageError}</p>
              </div>
            )}

            {/* Message Form */}
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                disabled={isMessageSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={isMessageSending || !message.trim()}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isMessageSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

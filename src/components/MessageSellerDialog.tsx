"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { validateEmail } from "../lib/utils";
import toast from "react-hot-toast";

interface MessageSellerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  sellerEmail: string;
}

export default function MessageSellerDialog({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  sellerEmail,
}: MessageSellerDialogProps) {
  const [formData, setFormData] = useState({
    buyerEmail: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(formData.buyerEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!formData.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert message into database
      const { error } = await supabase.from("messages").insert({
        listing_id: listingId,
        buyer_email: formData.buyerEmail,
        message: formData.message,
      });

      if (error) {
        throw error;
      }

      // In a real app, you would trigger an email here
      // For now, we'll just show a success message
      toast.success("Message sent successfully!");

      // Reset form
      setFormData({ buyerEmail: "", message: "" });
      onClose();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-black">Message Seller</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              About: {listingTitle}
            </label>
            <p className="text-sm text-gray-500">Seller: {sellerEmail}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Email
            </label>
            <input
              type="email"
              required
              value={formData.buyerEmail}
              onChange={(e) =>
                setFormData({ ...formData, buyerEmail: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              required
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Hi, I'm interested in your item..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

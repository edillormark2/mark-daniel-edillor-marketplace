"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Mail, Calendar, Tag } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { ListingWithCategory } from "../../../lib/types";
import { formatPrice, formatDate } from "../../../lib/utils";
import MessageSellerDialog from "../../../components/MessageSellerDialog";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<ListingWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            `
            *,
            categories (
              id,
              name
            )
          `
          )
          .eq("id", params.id)
          .single();

        if (error) {
          throw error;
        }

        setListing(data);
      } catch (error) {
        console.error("Error fetching listing:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchListing();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Listing not found
          </h1>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
                <p className="text-lg">No Image Available</p>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {listing.title}
            </h1>
            <p className="text-4xl font-bold text-green-600">
              {formatPrice(listing.price)}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Tag className="w-4 h-4" />
              <span>{listing.categories?.name || "Uncategorized"}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Listed {formatDate(listing.created_at)}</span>
            </div>
          </div>

          {listing.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Seller Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Mail className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">{listing.seller_email}</span>
              </div>
              <button
                onClick={() => setShowMessageDialog(true)}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>Message Seller</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <MessageSellerDialog
        isOpen={showMessageDialog}
        onClose={() => setShowMessageDialog(false)}
        listingId={listing.id}
        listingTitle={listing.title}
        sellerEmail={listing.seller_email}
      />
    </div>
  );
}

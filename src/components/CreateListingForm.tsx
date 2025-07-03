"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, X, ArrowLeft } from "lucide-react";
import { supabase, uploadImage } from "../lib/supabase";
import { Category } from "../lib/types";
import { validateEmail, validateFile } from "../lib/utils";
import toast from "react-hot-toast";

interface CreateListingFormProps {
  categories: Category[];
}

export default function CreateListingForm({
  categories,
}: CreateListingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    seller_email: "",
    category_id: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error!);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!validateEmail(formData.seller_email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if selected
      if (selectedFile) {
        console.log("Uploading image:", selectedFile.name);
        imageUrl = await uploadImage(selectedFile);
        console.log("Image uploaded successfully:", imageUrl);
      }

      // Insert listing
      const listingData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        seller_email: formData.seller_email.trim(),
        category_id: formData.category_id,
        image_url: imageUrl,
      };

      console.log("Inserting listing:", listingData);

      const { data, error } = await supabase
        .from("listings")
        .insert(listingData)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Listing created successfully:", data);
      toast.success("Listing created successfully!");

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      router.push("/");
    } catch (error: any) {
      console.error("Error creating listing:", error);

      // More specific error messages
      if (error.message?.includes("storage")) {
        toast.error("Failed to upload image. Please try again.");
      } else if (error.message?.includes("listings")) {
        toast.error(
          "Failed to create listing. Please check your data and try again."
        );
      } else {
        toast.error(`Error: ${error.message || "Unknown error occurred"}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected category name
  const selectedCategory = categories.find(
    (cat) => cat.id === formData.category_id
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section - Left */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Create New Listing
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>

              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Click to upload image</p>
                    <p className="text-sm text-gray-400">
                      PNG, JPG, WebP up to 5MB
                    </p>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="What are you selling?"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Describe your item..."
              />
            </div>

            {/* Price */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email *
              </label>
              <input
                type="email"
                required
                value={formData.seller_email}
                onChange={(e) =>
                  setFormData({ ...formData, seller_email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="your@email.com"
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Create Listing</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Preview Section - Right */}
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6 ">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Preview</h3>

          {/* Preview Card */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Image Preview */}
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No image selected</p>
                </div>
              )}
            </div>

            {/* Content Preview */}
            <div className="p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {formData.title || "Product Title"}
              </h4>

              <p className="text-2xl font-bold text-green-500 mb-2">
                {formData.price ? `$${formData.price}` : "$0.00"}
              </p>

              {selectedCategory && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mb-3">
                  {selectedCategory.name}
                </span>
              )}

              <p className="text-gray-600 text-sm mb-3">
                {formData.description || "No description provided"}
              </p>

              <div className="text-xs text-gray-500 border-t pt-3">
                <p>Contact: {formData.seller_email || "your@email.com"}</p>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Preview:</span> This is how your
              listing will appear to potential buyers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

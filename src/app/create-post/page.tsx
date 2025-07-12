"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  MAIN_CATEGORIES,
  SUB_CATEGORIES,
  CAMPUS_LIST,
  PostFormData,
} from "@/lib/types";
import { validateFile } from "@/lib/utils";
import { PostService } from "@/lib/posts";
import Loading from "@/components/ui/Loading";
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react";

const STEPS = ["Main Category", "Sub Category", "Details", "Photos", "Campus"];

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    description: "",
    price: "",
    main_category: "",
    sub_category: "",
    campus: "",
    photos: [],
  });

  const [campusSearch, setCampusSearch] = useState("");
  const [filteredCampuses, setFilteredCampuses] = useState<string[]>([]);
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
    }
  }, [user, router]);

  useEffect(() => {
    if (campusSearch) {
      const filtered = CAMPUS_LIST.filter((campus) =>
        campus.toLowerCase().includes(campusSearch.toLowerCase())
      );
      setFilteredCampuses(filtered);
      setShowCampusDropdown(true);
    } else {
      setFilteredCampuses([]);
      setShowCampusDropdown(false);
    }
  }, [campusSearch]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.main_category) {
          newErrors.main_category = "Please select a main category";
        }
        break;
      case 1:
        if (!formData.sub_category) {
          newErrors.sub_category = "Please select a sub category";
        }
        break;
      case 2:
        if (!formData.title.trim()) {
          newErrors.title = "Title is required";
        }
        if (!formData.description.trim()) {
          newErrors.description = "Description is required";
        }
        if (formData.price && isNaN(Number(formData.price))) {
          newErrors.price = "Price must be a valid number";
        }
        break;
      case 3:
        if (formData.photos.length === 0) {
          newErrors.photos = "At least one photo is required";
        }
        break;
      case 4:
        if (!formData.campus.trim()) {
          newErrors.campus = "Campus is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      main_category: category,
      sub_category: "",
    }));
    setErrors((prev) => ({ ...prev, main_category: "" }));
  };

  const handleSubCategoryChange = (subCategory: string) => {
    setFormData((prev) => ({
      ...prev,
      sub_category: subCategory,
    }));
    setErrors((prev) => ({ ...prev, sub_category: "" }));
  };

  const handleInputChange = (field: keyof PostFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    files.forEach((file) => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        newErrors.push(validation.error || "Invalid file");
      }
    });

    if (newErrors.length > 0) {
      setErrors((prev) => ({ ...prev, photos: newErrors.join(", ") }));
    } else {
      setErrors((prev) => ({ ...prev, photos: "" }));
    }

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...validFiles].slice(0, 5),
    }));
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleCampusSelect = (campus: string) => {
    setFormData((prev) => ({ ...prev, campus }));
    setCampusSearch(campus);
    setShowCampusDropdown(false);
    setErrors((prev) => ({ ...prev, campus: "" }));
  };

  const handleSubmit = async () => {
    if (!validateStep(4) || !user) return;

    setIsLoading(true);
    try {
      // Upload photos using PostService
      const { urls: photoUrls, error: uploadError } =
        await PostService.uploadPhotos(formData.photos, user.id);

      if (uploadError) {
        throw new Error(uploadError);
      }

      // Create post using PostService
      const { data: post, error: createError } = await PostService.createPost({
        title: formData.title,
        description: formData.description,
        price: formData.price ? Number(formData.price) : undefined,
        main_category: formData.main_category,
        sub_category: formData.sub_category,
        campus: formData.campus,
        photos: photoUrls,
        seller_id: user.id,
        seller_name: user.user_metadata.full_name || user.email,
        seller_email: user.email || "",
      });

      if (createError) {
        throw new Error(createError);
      }

      // Redirect to home page on success
      router.push("/");
    } catch (error) {
      console.error("Error creating post:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to create post. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Select Main Category</h2>
            <div className="grid grid-cols-2 gap-3">
              {MAIN_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.main_category === category
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {errors.main_category && (
              <p className="text-red-500 text-sm">{errors.main_category}</p>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Select Sub Category</h2>
            <div className="grid grid-cols-2 gap-3">
              {formData.main_category &&
                SUB_CATEGORIES[
                  formData.main_category as keyof typeof SUB_CATEGORIES
                ]?.map((subCategory) => (
                  <button
                    key={subCategory}
                    onClick={() => handleSubCategoryChange(subCategory)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.sub_category === subCategory
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {subCategory}
                  </button>
                ))}
            </div>
            {errors.sub_category && (
              <p className="text-red-500 text-sm">{errors.sub_category}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Post Details</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter post title"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Price (Optional)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter price"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your item or service"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Upload Photos</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Photos * (Max 5)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP up to 5MB each
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="mt-4"
                />
              </div>
              {errors.photos && (
                <p className="text-red-500 text-sm mt-1">{errors.photos}</p>
              )}
            </div>
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Select Campus</h2>
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Campus *</label>
              <input
                type="text"
                value={campusSearch}
                onChange={(e) => setCampusSearch(e.target.value)}
                onFocus={() => setShowCampusDropdown(true)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type to search for your campus"
              />
              {showCampusDropdown && filteredCampuses.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                  {filteredCampuses.map((campus) => (
                    <button
                      key={campus}
                      onClick={() => handleCampusSelect(campus)}
                      className="w-full p-3 text-left hover:bg-gray-100 border-b last:border-b-0"
                    >
                      {campus}
                    </button>
                  ))}
                </div>
              )}
              {errors.campus && (
                <p className="text-red-500 text-sm mt-1">{errors.campus}</p>
              )}
            </div>
            {user && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Your Contact Information</h3>
                <p className="text-sm text-gray-600">
                  Name: {user.user_metadata.full_name || "Not provided"}
                </p>
                <p className="text-sm text-gray-600">Email: {user.email}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading text="Please wait..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-2xl mx-auto p-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Create Post</h1>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => (
              <span
                key={step}
                className={`text-xs ${
                  index <= currentStep ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Post"}
            </button>
          )}
        </div>

        {errors.submit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
}

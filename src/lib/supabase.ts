import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper function to upload image with better error handling
export const uploadImage = async (file: File): Promise<string> => {
  try {
    // Validate file before upload
    if (!file) {
      throw new Error("No file provided");
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be less than 5MB");
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Create unique filename
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    console.log(
      "Uploading file:",
      fileName,
      "Size:",
      file.size,
      "Type:",
      file.type
    );

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("listings-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data returned from upload");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("listings-images")
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    console.log("Upload successful. Public URL:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error: unknown) {
    console.error("Error in uploadImage:", error);
    if (error instanceof Error) {
      throw new Error(error.message || "Failed to upload image");
    }
    throw new Error("Failed to upload image");
  }
};

// Helper function to delete image
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract filename from URL
    const fileName = imageUrl.split("/").pop();
    if (!fileName) {
      throw new Error("Invalid image URL");
    }

    const { error } = await supabase.storage
      .from("listings-images")
      .remove([fileName]);

    if (error) {
      console.error("Delete error:", error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error: unknown) {
    console.error("Error in deleteImage:", error);
    if (error instanceof Error) {
      throw new Error(error.message || "Failed to delete image");
    }
    throw new Error("Failed to delete image");
  }
};

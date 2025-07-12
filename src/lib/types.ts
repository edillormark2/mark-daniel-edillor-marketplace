// src/lib/types.ts
export interface Profile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  university?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Post {
  id: string;
  title: string;
  description: string;
  price?: number;
  main_category: string;
  sub_category: string;
  campus: string;
  photos: string[];
  seller_id: string;
  seller_name: string;
  seller_email: string;
  created_at: string;
  updated_at: string;
}

export interface PostFormData {
  title: string;
  description: string;
  price: string;
  main_category: string;
  sub_category: string;
  campus: string;
  photos: File[];
}

export interface Message {
  id: string;
  post_id: string;
  sender_id: string;
  sender_email: string;
  sender_name: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface MessageFormData {
  post_id: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  message: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Post, "id" | "created_at" | "updated_at">>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at">;
        Update: Partial<Omit<Message, "id" | "created_at">>;
      };
    };
  };
}

export const MAIN_CATEGORIES = [
  "Campus Jobs",
  "For Sale",
  "Jobs",
  "Services",
  "Community",
  "Housing",
  "Personals",
  "Events",
  "Housing Wanted",
  "Resumes",
] as const;

export const SUB_CATEGORIES = {
  "Campus Jobs": ["Part-time", "Full-time", "Internship", "Work Study"],
  "For Sale": [
    "Electronics",
    "Furniture",
    "Books",
    "Clothing",
    "Sports",
    "Other",
  ],
  Jobs: ["Full-time", "Part-time", "Contract", "Internship"],
  Services: ["Tutoring", "Cleaning", "Moving", "Tech Support", "Other"],
  Community: ["General", "Study Groups", "Clubs", "Volunteer"],
  Housing: ["Rent", "Sublet", "Roommate", "Sale"],
  Personals: [
    "Friendship",
    "Girl wants Guy",
    "General Romance",
    "Guy wants Girl",
    "Girl wants Girl",
    "Guy wants Guy",
  ],
  Events: ["Social", "Academic", "Sports", "Cultural", "Other"],
  "Housing Wanted": ["Rent", "Sublet", "Roommate", "Purchase"],
  Resumes: ["Entry Level", "Experienced", "Internship", "Graduate"],
} as const;

export const CAMPUS_LIST = [
  "University of California, Los Angeles",
  "Stanford University",
  "Harvard University",
  "Massachusetts Institute of Technology",
  "University of California, Berkeley",
  "Yale University",
  "Princeton University",
  "Columbia University",
  "University of Chicago",
  "University of Pennsylvania",
] as const;

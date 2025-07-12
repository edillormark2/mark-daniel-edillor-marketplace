export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          price: number;
          seller_email: string;
          category_id: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          price: number;
          seller_email: string;
          category_id?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          seller_email?: string;
          category_id?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          listing_id: string;
          buyer_email: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_email: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_email?: string;
          message?: string;
          created_at?: string;
        };
      };
    };
  };
};

export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

export type ListingWithCategory = Listing & {
  categories: Category | null;
};

export type CreateListingData = {
  title: string;
  description: string;
  price: number;
  seller_email: string;
  category_id: string;
  image?: File;
};

export type CreateMessageData = {
  listing_id: string;
  buyer_email: string;
  message: string;
};

export interface Profile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
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

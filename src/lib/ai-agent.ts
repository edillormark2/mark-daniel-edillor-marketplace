// src/lib/ai-agent.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { PostService } from "./posts";
import {
  MAIN_CATEGORIES,
  SUB_CATEGORIES,
  CAMPUS_LIST,
  Post,
  Profile,
} from "./types";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024,
  },
});

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface UserContext {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  university?: string;
  avatar_url?: string;
  created_at: string;
  postsCount?: number;
  lastActive?: string;
  universityPostsCount?: number;
}

export interface MarketplaceContext {
  categories: string[];
  subcategories: Record<string, readonly string[]>;
  campuses: string[];
  recentPosts?: Post[];
  popularCategories?: string[];
  totalPosts?: number;
  universityPosts?: Post[];
}

export interface ChatContext {
  messages: ChatMessage[];
  userInfo?: UserContext;
  marketplaceInfo?: MarketplaceContext;
  sessionId?: string;
}

export class AIAgent {
  // Get user profile from database
  private static async getUserContext(userId: string): Promise<UserContext> {
    try {
      // Get user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return {
          id: userId,
          email: "",
          created_at: new Date().toISOString(),
        };
      }

      // Get user's posts count
      const { data: userPosts, error: userPostsError } = await supabase
        .from("posts")
        .select("*")
        .eq("seller_id", userId);

      if (userPostsError) {
        console.error("Error fetching user posts:", userPostsError);
      }

      // Get university-specific posts count if user has university
      let universityPostsCount = 0;
      if (profile.university) {
        const { data: universityPosts, error: universityError } = await supabase
          .from("posts")
          .select("*")
          .eq("campus", profile.university);

        if (!universityError && universityPosts) {
          universityPostsCount = universityPosts.length;
        }
      }

      return {
        id: userId,
        email: profile.email || "",
        username: profile.username,
        full_name: profile.full_name,
        university: profile.university,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        postsCount: userPosts?.length || 0,
        lastActive: new Date().toISOString(),
        universityPostsCount,
      };
    } catch (error) {
      console.error("Error in getUserContext:", error);
      return {
        id: userId,
        email: "",
        created_at: new Date().toISOString(),
      };
    }
  }

  // Get comprehensive marketplace context
  private static async getMarketplaceContext(
    userUniversity?: string
  ): Promise<MarketplaceContext> {
    try {
      // Get all recent posts
      const { data: recentPosts, error: recentError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (recentError) {
        console.error("Error fetching recent posts:", recentError);
      }

      // Get posts count by category
      const { data: allPosts, error: allPostsError } = await supabase
        .from("posts")
        .select("main_category");

      if (allPostsError) {
        console.error("Error fetching all posts:", allPostsError);
      }

      // Calculate category counts
      const categoryCounts =
        allPosts?.reduce((acc, post) => {
          acc[post.main_category] = (acc[post.main_category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      const popularCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category]) => category);

      // Get university-specific posts if user has university
      let universityPosts: Post[] = [];
      if (userUniversity) {
        const { data: univPosts, error: univError } = await supabase
          .from("posts")
          .select("*")
          .eq("campus", userUniversity)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!univError && univPosts) {
          universityPosts = univPosts;
        }
      }

      return {
        categories: [...MAIN_CATEGORIES],
        subcategories: SUB_CATEGORIES as Record<string, readonly string[]>,
        campuses: [...CAMPUS_LIST],
        recentPosts: recentPosts || [],
        popularCategories,
        totalPosts: allPosts?.length || 0,
        universityPosts,
      };
    } catch (error) {
      console.error("Error in getMarketplaceContext:", error);
      return {
        categories: [...MAIN_CATEGORIES],
        subcategories: SUB_CATEGORIES as Record<string, readonly string[]>,
        campuses: [...CAMPUS_LIST],
        recentPosts: [],
        popularCategories: [],
        totalPosts: 0,
        universityPosts: [],
      };
    }
  }

  // Generate comprehensive system prompt
  private static async getSystemPrompt(context: ChatContext): Promise<string> {
    let userContext = context.userInfo;

    // Fetch user context if missing or incomplete
    if (!userContext?.university && context.userInfo?.id) {
      userContext = await this.getUserContext(context.userInfo.id);
    }

    // Get marketplace context
    const marketplaceContext = await this.getMarketplaceContext(
      userContext?.university
    );

    const systemPrompt = `You are an AI assistant for a campus marketplace platform. Your role is to help users find items, provide marketplace guidance, and answer questions based on REAL DATA from our database.

IMPORTANT RULES:
1. ONLY suggest items that actually exist in our database
2. When users ask about posts/items, search the database first
3. Provide specific, relevant suggestions based on user's university when possible
4. Never make up listings or information
5. Be helpful and conversational while staying factual

${
  userContext
    ? `USER PROFILE:
- Name: ${userContext.full_name || "Not provided"}
- University: ${userContext.university || "Not specified"}
- Email: ${userContext.email}
- Member since: ${new Date(userContext.created_at).toLocaleDateString()}
- Posts created: ${userContext.postsCount || 0}
- University marketplace items: ${userContext.universityPostsCount || 0}
`
    : ""
}

MARKETPLACE STATUS:
- Total posts in database: ${marketplaceContext.totalPosts}
- Popular categories: ${
      marketplaceContext.popularCategories?.join(", ") || "None"
    }
- Available categories: ${marketplaceContext.categories.join(", ")}
- Supported campuses: ${marketplaceContext.campuses.join(", ")}

${
  marketplaceContext.recentPosts && marketplaceContext.recentPosts.length > 0
    ? `
RECENT MARKETPLACE ACTIVITY:
${marketplaceContext.recentPosts
  .slice(0, 5)
  .map(
    (post) =>
      `- "${post.title}" (${post.main_category}) - ${
        post.price ? `$${post.price}` : "Free"
      } - ${post.campus}`
  )
  .join("\n")}
`
    : ""
}

${
  userContext?.university &&
  marketplaceContext.universityPosts &&
  marketplaceContext.universityPosts.length > 0
    ? `
RECENT POSTS AT YOUR UNIVERSITY (${userContext.university}):
${marketplaceContext.universityPosts
  .slice(0, 5)
  .map(
    (post) =>
      `- "${post.title}" (${post.main_category}) - ${
        post.price ? `$${post.price}` : "Free"
      }`
  )
  .join("\n")}
`
    : ""
}

When users ask about specific items or categories, search the database and provide accurate, helpful responses based on what's actually available.`;

    return systemPrompt;
  }

  // Search for relevant posts based on user query
  static async searchRelevantPosts(
    query: string,
    userUniversity?: string,
    filters: Record<string, any> = {}
  ): Promise<Post[]> {
    try {
      // Start with base query
      let supabaseQuery = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply text search
      if (query) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,main_category.ilike.%${query}%,sub_category.ilike.%${query}%`
        );
      }

      // Apply filters
      if (filters.main_category) {
        supabaseQuery = supabaseQuery.eq(
          "main_category",
          filters.main_category
        );
      }

      if (filters.sub_category) {
        supabaseQuery = supabaseQuery.eq("sub_category", filters.sub_category);
      }

      if (filters.campus) {
        supabaseQuery = supabaseQuery.eq("campus", filters.campus);
      }

      // Prioritize user's university if available
      if (userUniversity && !filters.campus) {
        supabaseQuery = supabaseQuery.eq("campus", userUniversity);
      }

      if (filters.minPrice) {
        supabaseQuery = supabaseQuery.gte("price", filters.minPrice);
      }

      if (filters.maxPrice) {
        supabaseQuery = supabaseQuery.lte("price", filters.maxPrice);
      }

      const { data, error } = await supabaseQuery.limit(10);

      if (error) {
        console.error("Error searching posts:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in searchRelevantPosts:", error);
      return [];
    }
  }

  // Extract search intent from user message
  static extractSearchIntent(
    message: string
  ): { query: string; category?: string } | null {
    const lowerMessage = message.toLowerCase();

    // Check for explicit search patterns
    const searchPatterns = [
      /(?:looking for|find|search|need|want|any|show me)\s+(.+)/i,
      /(.+)\s+(?:for sale|available)/i,
      /do you have\s+(.+)/i,
      /where can i find\s+(.+)/i,
    ];

    for (const pattern of searchPatterns) {
      const match = message.match(pattern);
      if (match) {
        const query = match[1].trim();

        // Check if query mentions a category
        const category = MAIN_CATEGORIES.find((cat) =>
          query.toLowerCase().includes(cat.toLowerCase())
        );

        return { query, category };
      }
    }

    // Check for direct category mentions
    const category = MAIN_CATEGORIES.find((cat) =>
      lowerMessage.includes(cat.toLowerCase())
    );

    if (category) {
      return { query: category, category };
    }

    // Check for subcategory mentions
    for (const [mainCat, subCats] of Object.entries(SUB_CATEGORIES)) {
      const subCategory = subCats.find((sub) =>
        lowerMessage.includes(sub.toLowerCase())
      );
      if (subCategory) {
        return { query: subCategory, category: mainCat };
      }
    }

    return null;
  }

  // Process user message and generate response
  static async processMessage(
    userMessage: string,
    context: ChatContext
  ): Promise<string> {
    try {
      // Get user context if not available
      let userContext = context.userInfo;
      if (!userContext?.university && context.userInfo?.id) {
        userContext = await this.getUserContext(context.userInfo.id);
      }

      // Check if this is a search query
      const searchIntent = this.extractSearchIntent(userMessage);

      if (searchIntent) {
        const filters: Record<string, any> = {};

        if (searchIntent.category) {
          filters.main_category = searchIntent.category;
        }

        const posts = await this.searchRelevantPosts(
          searchIntent.query,
          userContext?.university,
          filters
        );

        if (posts.length > 0) {
          const listings = posts
            .slice(0, 5)
            .map(
              (post) =>
                `• "${post.title}" (${post.main_category}) - ${
                  post.price ? `$${post.price}` : "Free"
                } - ${post.campus}\n  ${post.description.substring(0, 100)}...`
            )
            .join("\n\n");

          return `I found ${posts.length} matching item${
            posts.length > 1 ? "s" : ""
          } in our marketplace:\n\n${listings}\n\n${
            posts.length > 5 ? `And ${posts.length - 5} more items...` : ""
          }Would you like more details about any of these items?`;
        } else {
          // If no posts found, suggest creating one
          return `I couldn't find any "${
            searchIntent.query
          }" items in our marketplace${
            userContext?.university ? ` at ${userContext.university}` : ""
          }. Would you like to create a new post to sell or request this item?`;
        }
      }

      // Check if user is asking about their own posts
      if (userMessage.toLowerCase().includes("my post") && userContext?.id) {
        const { data: userPosts, error } = await supabase
          .from("posts")
          .select("*")
          .eq("seller_id", userContext.id)
          .order("created_at", { ascending: false });

        if (!error && userPosts && userPosts.length > 0) {
          const postsList = userPosts
            .slice(0, 5)
            .map(
              (post) =>
                `• "${post.title}" - Posted ${new Date(
                  post.created_at
                ).toLocaleDateString()}`
            )
            .join("\n");

          return `You have ${userPosts.length} active listing${
            userPosts.length > 1 ? "s" : ""
          }:\n\n${postsList}${
            userPosts.length > 5
              ? `\n\nAnd ${userPosts.length - 5} more...`
              : ""
          }`;
        } else {
          return "You don't have any active listings yet. Would you like to create your first post?";
        }
      }

      // For general queries, use AI with context
      const systemPrompt = await this.getSystemPrompt({
        ...context,
        userInfo: userContext,
      });

      const fullPrompt = `${systemPrompt}

CONVERSATION HISTORY:
${context.messages
  .slice(-6)
  .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n")}

CURRENT USER QUERY: ${userMessage}

Please provide a helpful response based on the actual data above. If the user is asking about items/posts, make sure to search the database first.`;

      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return this.sanitizeResponse(text);
    } catch (error) {
      console.error("AI Agent processing error:", error);
      return "I'm having trouble processing your request. Please try again or contact support if the issue persists.";
    }
  }

  // Sanitize AI response
  static sanitizeResponse(response: string): string {
    let sanitized = response.trim();

    // Limit response length
    if (sanitized.length > 800) {
      sanitized = sanitized.substring(0, 797) + "...";
    }

    // Remove potentially harmful content
    const sensitivePatterns = [
      /password/i,
      /credit card/i,
      /ssn/i,
      /social security/i,
      /api[_\s]key/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(sanitized)) {
        return "I cannot provide information about sensitive data. Please contact support if you need help with account-related issues.";
      }
    }

    return sanitized;
  }

  // Get posts by category for context
  static async getPostsByCategory(
    category: string,
    userUniversity?: string
  ): Promise<Post[]> {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .eq("main_category", category)
        .order("created_at", { ascending: false });

      if (userUniversity) {
        query = query.eq("campus", userUniversity);
      }

      const { data, error } = await query.limit(10);

      if (error) {
        console.error("Error fetching posts by category:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getPostsByCategory:", error);
      return [];
    }
  }
}

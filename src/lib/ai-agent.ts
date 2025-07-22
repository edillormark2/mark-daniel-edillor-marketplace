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
    maxOutputTokens: 2048, // Increased for richer responses
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
  allRecentPosts?: Post[]; // Added for global marketplace view
}

export interface ChatContext {
  messages: ChatMessage[];
  userInfo?: UserContext;
  marketplaceInfo?: MarketplaceContext;
  sessionId?: string;
}

// Enhanced post details interface
export interface EnhancedPost extends Post {
  imageUrls?: string[];
  formattedDate?: string;
  postUrl?: string;
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

  // Get comprehensive marketplace context (ENHANCED)
  private static async getMarketplaceContext(
    userUniversity?: string
  ): Promise<MarketplaceContext> {
    try {
      // Get ALL recent posts (not just user's university)
      const { data: allRecentPosts, error: allRecentError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20); // Increased limit for better context

      if (allRecentError) {
        console.error("Error fetching all recent posts:", allRecentError);
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
        recentPosts: universityPosts, // User's university posts
        allRecentPosts: allRecentPosts || [], // All marketplace posts
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
        allRecentPosts: [],
        popularCategories: [],
        totalPosts: 0,
        universityPosts: [],
      };
    }
  }

  // Enhance posts with image URLs and formatted data
  private static async enhancePosts(posts: Post[]): Promise<EnhancedPost[]> {
    return posts.map((post) => {
      const enhancedPost: EnhancedPost = {
        ...post,
        formattedDate: new Date(post.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        postUrl: `/post/${post.id}`,
        imageUrls: [],
      };

      // Generate image URLs from Supabase storage
      if (post.photos && post.photos.length > 0) {
        enhancedPost.imageUrls = post.photos.map((photo) => {
          const { data } = supabase.storage
            .from("post-photos")
            .getPublicUrl(photo);
          return data.publicUrl;
        });
      }

      return enhancedPost;
    });
  }

  // Generate comprehensive system prompt (ENHANCED)
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
3. You can search ACROSS ALL UNIVERSITIES, not just the user's campus
4. When showing posts, ALWAYS include:
   - Title and description
   - Price (or "Free" if no price)
   - Campus/University location
   - Date posted
   - Direct link to view the post (MUST use actual post ID, not placeholders)
   - Mention if there are photos available
5. Format post links as clickable: [View Post](/post/{actual_post_id}) - NEVER use {post_id} placeholder
6. Be helpful and conversational while staying factual
7. If a user asks for items from other universities, search the entire marketplace
8. When you find posts, use the EXACT format provided by the search results, including the actual post ID

${
  userContext
    ? `USER PROFILE:
- Name: ${userContext.full_name || "Not provided"}
- University: ${userContext.university || "Not specified"}
- Email: ${userContext.email}
- Member since: ${new Date(userContext.created_at).toLocaleDateString()}
- Posts created: ${userContext.postsCount || 0}
- Items at your university: ${userContext.universityPostsCount || 0}
`
    : ""
}

MARKETPLACE STATISTICS:
- Total posts in marketplace: ${marketplaceContext.totalPosts}
- Active universities: ${marketplaceContext.campuses.length}
- Popular categories: ${
      marketplaceContext.popularCategories?.join(", ") || "None"
    }
- Available categories: ${marketplaceContext.categories.join(", ")}

${
  marketplaceContext.allRecentPosts &&
  marketplaceContext.allRecentPosts.length > 0
    ? `
RECENT MARKETPLACE ACTIVITY (ALL CAMPUSES):
${marketplaceContext.allRecentPosts
  .slice(0, 5)
  .map(
    (post) =>
      `- "${post.title}" (${post.main_category}) - ${
        post.price ? `$${post.price}` : "Free"
      } - ${post.campus} - Posted ${new Date(
        post.created_at
      ).toLocaleDateString()}`
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
RECENT POSTS AT ${userContext.university}:
${marketplaceContext.universityPosts
  .slice(0, 5)
  .map(
    (post) =>
      `- "${post.title}" (${post.main_category}) - ${
        post.price ? `$${post.price}` : "Free"
      } - Posted ${new Date(post.created_at).toLocaleDateString()}`
  )
  .join("\n")}
`
    : ""
}

When users ask about specific items or categories, search the ENTIRE database (all universities) unless they specifically ask for their campus only. Always provide rich, detailed responses with all relevant information including direct links to view posts.`;

    return systemPrompt;
  }

  // Enhanced search for relevant posts (UPDATED)
  static async searchRelevantPosts(
    query: string,
    userUniversity?: string,
    filters: Record<string, any> = {},
    searchAllCampuses: boolean = true // New parameter
  ): Promise<EnhancedPost[]> {
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

      // Only filter by campus if explicitly requested or if searchAllCampuses is false
      if (filters.campus) {
        supabaseQuery = supabaseQuery.eq("campus", filters.campus);
      } else if (!searchAllCampuses && userUniversity) {
        supabaseQuery = supabaseQuery.eq("campus", userUniversity);
      }

      if (filters.minPrice) {
        supabaseQuery = supabaseQuery.gte("price", filters.minPrice);
      }

      if (filters.maxPrice) {
        supabaseQuery = supabaseQuery.lte("price", filters.maxPrice);
      }

      const { data, error } = await supabaseQuery.limit(20); // Increased limit

      if (error) {
        console.error("Error searching posts:", error);
        return [];
      }

      // Enhance posts with additional data
      return await this.enhancePosts(data || []);
    } catch (error) {
      console.error("Error in searchRelevantPosts:", error);
      return [];
    }
  }

  // Enhanced search intent extraction
  static extractSearchIntent(
    message: string
  ): { query: string; category?: string; searchAllCampuses?: boolean } | null {
    const lowerMessage = message.toLowerCase();

    // Check if user wants to search all campuses
    const searchAllCampuses =
      lowerMessage.includes("all campus") ||
      lowerMessage.includes("all universities") ||
      lowerMessage.includes("everywhere") ||
      lowerMessage.includes("any campus") ||
      lowerMessage.includes("other universities");

    // Check for campus-specific search
    const myCampusOnly =
      lowerMessage.includes("my campus") ||
      lowerMessage.includes("my university") ||
      lowerMessage.includes("at my school");

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

        return {
          query,
          category,
          searchAllCampuses: searchAllCampuses || !myCampusOnly,
        };
      }
    }

    // Check for direct category mentions
    const category = MAIN_CATEGORIES.find((cat) =>
      lowerMessage.includes(cat.toLowerCase())
    );

    if (category) {
      return {
        query: category,
        category,
        searchAllCampuses: searchAllCampuses || !myCampusOnly,
      };
    }

    // Check for subcategory mentions
    for (const [mainCat, subCats] of Object.entries(SUB_CATEGORIES)) {
      const subCategory = subCats.find((sub) =>
        lowerMessage.includes(sub.toLowerCase())
      );
      if (subCategory) {
        return {
          query: subCategory,
          category: mainCat,
          searchAllCampuses: searchAllCampuses || !myCampusOnly,
        };
      }
    }

    return null;
  }

  // Format post for display (NEW METHOD)
  private static formatPostForDisplay(post: EnhancedPost): string {
    const priceDisplay = post.price ? `${post.price}` : "Free";
    const hasPhotos = post.photos && post.photos.length > 0;
    const description = post.description || "No description provided";

    return `📦 **${post.title}**
💰 Price: ${priceDisplay}
📍 Campus: ${post.campus}
📅 Posted: ${post.formattedDate}
${
  hasPhotos
    ? `📷 ${post.photos.length} photo${
        post.photos.length > 1 ? "s" : ""
      } available`
    : "📷 No photos available"
}
📝 ${description.substring(0, 150)}${description.length > 150 ? "..." : ""}

🔗 [View Full Details](/post/${post.id}) ↗️`;
  }

  // Enhanced process message (UPDATED)
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

      // Check if this is a search query (expanded detection)
      const searchIntent = this.extractSearchIntent(userMessage);

      // Also check for general item mentions even without explicit search keywords
      const lowerMessage = userMessage.toLowerCase();
      const mightBeSearching =
        searchIntent ||
        lowerMessage.includes("bike") ||
        lowerMessage.includes("laptop") ||
        lowerMessage.includes("book") ||
        lowerMessage.includes("furniture") ||
        lowerMessage.includes("electronics") ||
        lowerMessage.includes("textbook") ||
        lowerMessage.includes("item") ||
        lowerMessage.includes("post") ||
        lowerMessage.includes("listing");

      if (mightBeSearching) {
        const filters: Record<string, any> = {};

        // Extract search term from message if no explicit search intent
        let searchQuery = "";
        if (searchIntent) {
          searchQuery = searchIntent.query;
          if (searchIntent.category) {
            filters.main_category = searchIntent.category;
          }
        } else {
          // Try to extract item name from message
          const words = lowerMessage.split(/\s+/);
          const itemKeywords = [
            "bike",
            "laptop",
            "book",
            "furniture",
            "electronics",
            "textbook",
            "phone",
            "desk",
            "chair",
          ];
          searchQuery = words.find((word) => itemKeywords.includes(word)) || "";
        }

        const posts = await this.searchRelevantPosts(
          searchQuery,
          userContext?.university,
          filters,
          searchIntent?.searchAllCampuses !== false
        );

        // Debug log to verify data
        console.log(
          "Search results:",
          posts.slice(0, 2).map((p) => ({
            id: p.id,
            title: p.title,
            link: `/post/${p.id}`,
          }))
        );

        if (posts.length > 0) {
          const searchScope =
            searchIntent?.searchAllCampuses === false
              ? ` at ${userContext?.university}`
              : " across all campuses";

          // Format all posts with their actual IDs
          const formattedPosts = posts.slice(0, 5).map((post) => ({
            id: post.id,
            title: post.title,
            description: post.description || "No description provided",
            price: post.price,
            campus: post.campus,
            created_at: post.created_at,
            photos: post.photos,
            formattedDate: post.formattedDate,
            link: `/post/${post.id}`, // Actual ID
          }));

          // Create a detailed response with actual post data
          const listings = posts
            .slice(0, 5)
            .map((post) => this.formatPostForDisplay(post))
            .join("\n\n---\n\n");

          return `I found ${posts.length} matching item${
            posts.length > 1 ? "s" : ""
          }${searchScope}:\n\n${listings}\n\n${
            posts.length > 5
              ? `📊 **And ${posts.length - 5} more items available!**\n\n`
              : ""
          }💡 **Tip:** Click on "View Full Details" to see photos and contact the seller. Would you like to refine your search or see items from ${
            searchIntent?.searchAllCampuses === false
              ? "other campuses"
              : "your campus only"
          }?`;
        } else {
          const searchScope =
            searchIntent?.searchAllCampuses === false
              ? ` at ${userContext?.university}`
              : " in the entire marketplace";

          return `I couldn't find any "${searchQuery}" items${searchScope}. 

Would you like to:
1. 🔍 Search all campuses? (if you haven't already)
2. 📝 Create a new post to sell or request this item?
3. 🔔 Set up an alert for when this item becomes available?

Just let me know how I can help!`;
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
          const enhancedUserPosts = await this.enhancePosts(userPosts);
          const postsList = enhancedUserPosts
            .slice(0, 5)
            .map((post) => this.formatPostForDisplay(post))
            .join("\n\n---\n\n");

          return `You have ${userPosts.length} active listing${
            userPosts.length > 1 ? "s" : ""
          }:\n\n${postsList}${
            userPosts.length > 5
              ? `\n\n📊 **And ${userPosts.length - 5} more listings...**`
              : ""
          }\n\n💡 **Tip:** You can edit or delete your posts by clicking "View Full Details"`;
        } else {
          return "You don't have any active listings yet. Would you like to create your first post? I can guide you through the process!";
        }
      }

      // For general queries, use AI with context
      const systemPrompt = await this.getSystemPrompt({
        ...context,
        userInfo: userContext,
      });

      // Get some recent posts to provide context
      const recentPosts = await this.searchRelevantPosts(
        "",
        userContext?.university,
        {},
        true
      );
      const formattedRecentPosts = recentPosts.slice(0, 10).map((post) => ({
        id: post.id,
        title: post.title,
        description: post.description || "No description provided",
        price: post.price ? `${post.price}` : "Free",
        campus: post.campus,
        date: post.formattedDate,
        photos_count: post.photos?.length || 0,
        link: `/post/${post.id}`,
      }));

      const fullPrompt = `${systemPrompt}

RECENT POSTS DATA (for reference):
${JSON.stringify(formattedRecentPosts, null, 2)}

CONVERSATION HISTORY:
${context.messages
  .slice(-6)
  .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n")}

CURRENT USER QUERY: ${userMessage}

IMPORTANT: When showing posts to users, you MUST:
1. Use the ACTUAL post ID from the data, never use placeholders like {post_id}
2. Format links as [View Post](/post/ACTUAL_ID_HERE)
3. Include all relevant details from the post data
4. If the user asks about specific items, search for them first

Please provide a helpful response based on the actual data above.`;

      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return this.sanitizeResponse(text);
    } catch (error) {
      console.error("AI Agent processing error:", error);
      return "I'm having trouble processing your request. Please try again or contact support if the issue persists.";
    }
  }

  // Enhanced sanitize response
  static sanitizeResponse(response: string): string {
    let sanitized = response.trim();

    // Limit response length
    if (sanitized.length > 1500) {
      // Increased limit for richer responses
      sanitized = sanitized.substring(0, 1497) + "...";
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

  // Get posts by category for context (ENHANCED)
  static async getPostsByCategory(
    category: string,
    userUniversity?: string,
    allCampuses: boolean = false
  ): Promise<EnhancedPost[]> {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .eq("main_category", category)
        .order("created_at", { ascending: false });

      // Only filter by university if not searching all campuses
      if (!allCampuses && userUniversity) {
        query = query.eq("campus", userUniversity);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error("Error fetching posts by category:", error);
        return [];
      }

      return await this.enhancePosts(data || []);
    } catch (error) {
      console.error("Error in getPostsByCategory:", error);
      return [];
    }
  }

  // Get marketplace statistics (NEW METHOD)
  static async getMarketplaceStats(): Promise<{
    totalPosts: number;
    activeCampuses: string[];
    categoryBreakdown: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      // Get total posts
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      // Get active campuses
      const { data: campusData } = await supabase
        .from("posts")
        .select("campus")
        .order("campus");

      const activeCampuses = Array.from(
        new Set(campusData?.map((p) => p.campus) || [])
      );

      // Get category breakdown
      const { data: categoryData } = await supabase
        .from("posts")
        .select("main_category");

      const categoryBreakdown =
        categoryData?.reduce((acc, post) => {
          acc[post.main_category] = (acc[post.main_category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      // Get recent activity (posts in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentActivity } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      return {
        totalPosts: totalPosts || 0,
        activeCampuses,
        categoryBreakdown,
        recentActivity: recentActivity || 0,
      };
    } catch (error) {
      console.error("Error getting marketplace stats:", error);
      return {
        totalPosts: 0,
        activeCampuses: [],
        categoryBreakdown: {},
        recentActivity: 0,
      };
    }
  }
}

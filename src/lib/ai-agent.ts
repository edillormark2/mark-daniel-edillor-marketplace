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

const CATEGORY_SYNONYMS: { [key: string]: string } = {
  // Housing
  "housing options": "Housing",
  "housing listings": "Housing",
  "places to live": "Housing",
  apartments: "Housing",
  dorms: "Housing",
  rooms: "Housing",
  roommate: "Housing",
  sublet: "Housing",
  rentals: "Housing",
  "student housing": "Housing",
  // For Sale
  "items for sale": "For Sale",
  "things for sale": "For Sale",
  "stuff for sale": "For Sale",
  marketplace: "For Sale",
  // Recent/Latest For Sale
  "most recent items posted for sale": "For Sale",
  "recent items": "For Sale",
  "latest items": "For Sale",
  "recent for sale": "For Sale",
  "recently posted items": "For Sale",
  "recent posts": "For Sale",
  "recent listings": "For Sale",
  "latest for sale": "For Sale",
  // Campus Jobs
  "campus jobs": "Campus Jobs",
  "available campus jobs": "Campus Jobs",
  "what campus jobs are available": "Campus Jobs",
  "student jobs": "Campus Jobs",
  "on-campus jobs": "Campus Jobs",
  "on campus jobs": "Campus Jobs",
  // Jobs
  job: "Jobs",
  jobs: "Jobs",
  work: "Jobs",
  employment: "Jobs",
  // Services
  tutoring: "Services",
  cleaning: "Services",
  moving: "Services",
  "tech support": "Services",
  // Community
  "study group": "Community",
  club: "Community",
  volunteer: "Community",
  // Personals
  friend: "Personals",
  romance: "Personals",
  // Events
  event: "Events",
  events: "Events",
  // Housing Wanted
  "need housing": "Housing Wanted",
  "looking for housing": "Housing Wanted",
  // Resumes
  resume: "Resumes",
  resumes: "Resumes",
};

// Add fuzzy match utility at the top (after imports)
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyMatch(
  word: string,
  options: string[],
  maxDistance = 2
): string | null {
  let best: { match: string; dist: number } | null = null;
  for (const opt of options) {
    const dist = levenshtein(word.toLowerCase(), opt.toLowerCase());
    if (dist <= maxDistance && (!best || dist < best.dist)) {
      best = { match: opt, dist };
    }
  }
  return best ? best.match : null;
}

// Map common keywords to categories/subcategories
const KEYWORD_CATEGORY_MAP: Record<
  string,
  { category: string; subcategory?: string }
> = {
  jobs: { category: "Campus Jobs" },
  job: { category: "Campus Jobs" },
  employment: { category: "Campus Jobs" },
  phone: { category: "For Sale", subcategory: "Electronics" },
  phones: { category: "For Sale", subcategory: "Electronics" },
  laptop: { category: "For Sale", subcategory: "Electronics" },
  laptops: { category: "For Sale", subcategory: "Electronics" },
  electronic: { category: "For Sale", subcategory: "Electronics" },
  electronics: { category: "For Sale", subcategory: "Electronics" },
  house: { category: "Housing" },
  houses: { category: "Housing" },
  home: { category: "Housing" },
  homes: { category: "Housing" },
  apartment: { category: "Housing" },
  apartments: { category: "Housing" },
  bike: { category: "For Sale", subcategory: "Sports" },
  bikes: { category: "For Sale", subcategory: "Sports" },
  bicycle: { category: "For Sale", subcategory: "Sports" },
  furniture: { category: "For Sale", subcategory: "Furniture" },
  textbook: { category: "For Sale", subcategory: "Books" },
  textbooks: { category: "For Sale", subcategory: "Books" },
  book: { category: "For Sale", subcategory: "Books" },
  books: { category: "For Sale", subcategory: "Books" },
  roommate: { category: "Housing", subcategory: "Roommate" },
  sublet: { category: "Housing", subcategory: "Sublet" },
  room: { category: "Housing", subcategory: "Roommate" },
  rooms: { category: "Housing", subcategory: "Roommate" },
  // add more as needed
};

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

    // Add Capmus details to the system prompt
    const capmusDetails = `\nCAPMUS PLATFORM INFO:\n- Capmus is an online marketplace for university students, especially Stanford, to buy, sell, and trade goods and services such as housing, off-campus jobs, and bikes.\n- Listings are verified to ensure authenticity.\n- Users must have a @stanford.edu email address in order to post.\n- The founder and CEO is Greg Wientje.\n- Capmus helps students connect safely and efficiently for campus-related transactions.\n- The platform is designed to foster a trusted community for students to exchange goods and services.\n- Capmus is not affiliated with Stanford University but is built for the Stanford student community.\n`;

    const systemPrompt = `You are an AI assistant for a campus marketplace platform. Your main goal is to support and guide users with any questions about the marketplace. Be friendly, conversational, and approachable—like a helpful student peer. Use a warm, supportive tone, and always try to make the user feel welcome and understood. If the user seems lost or unsure, offer suggestions or clarifying questions. When answering, be clear, concise, and human—avoid sounding robotic. If you don't know something, say so honestly, and offer to help find the answer or suggest next steps.

Your role is to help users find items, provide marketplace guidance, and answer questions based on REAL DATA from our database.

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
    ? `\nRECENT MARKETPLACE ACTIVITY (ALL CAMPUSES):\n${marketplaceContext.allRecentPosts
        .slice(0, 5)
        .map(
          (post) =>
            `- "${post.title}" (${post.main_category}) - ${
              post.price ? `$${post.price}` : "Free"
            } - ${post.campus} - Posted ${new Date(
              post.created_at
            ).toLocaleDateString()}`
        )
        .join("\n")}`
    : ""
}

${
  userContext?.university &&
  marketplaceContext.universityPosts &&
  marketplaceContext.universityPosts.length > 0
    ? `\nRECENT POSTS AT ${
        userContext.university
      }:\n${marketplaceContext.universityPosts
        .slice(0, 5)
        .map(
          (post) =>
            `- "${post.title}" (${post.main_category}) - ${
              post.price ? `$${post.price}` : "Free"
            } - Posted ${new Date(post.created_at).toLocaleDateString()}`
        )
        .join("\n")}`
    : ""
}

${capmusDetails}

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

      // If searching by category/subcategory, and query is just the subcategory, skip text search
      if (
        filters.main_category &&
        filters.sub_category &&
        query &&
        query.toLowerCase() === filters.sub_category.toLowerCase()
      ) {
        query = "";
      }

      // Apply text search (now includes campus/university)
      if (query) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,main_category.ilike.%${query}%,sub_category.ilike.%${query}%,campus.ilike.%${query}%`
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
    message: string,
    userUniversity?: string
  ): {
    query: string;
    category?: string;
    subcategory?: string;
    searchAllCampuses?: boolean;
    campus?: string;
    correctionNote?: string;
  } | null {
    const lowerMessage = message.toLowerCase();
    let correctionNote = "";

    // Fuzzy match for main categories, subcategories, and keywords
    const allMainCats = [...MAIN_CATEGORIES];
    const allSubCats = Object.values(SUB_CATEGORIES).flat();
    const allKeywords = Object.keys(KEYWORD_CATEGORY_MAP);
    const words = lowerMessage.split(/\s+/);
    let matchedCategory: string | undefined;
    let matchedSubcategory: string | undefined;
    let matchedKeyword: string | undefined;
    let correctedWord: string | undefined;

    for (const word of words) {
      // Fuzzy match main category
      const cat = fuzzyMatch(word, allMainCats);
      if (cat) {
        matchedCategory = cat;
        if (cat.toLowerCase() !== word)
          correctionNote = `Corrected "${word}" to "${cat}".`;
        break;
      }
      // Fuzzy match subcategory
      const subcat = fuzzyMatch(word, allSubCats);
      if (subcat) {
        matchedSubcategory = subcat;
        if (subcat.toLowerCase() !== word)
          correctionNote = `Corrected "${word}" to "${subcat}".`;
        break;
      }
      // Fuzzy match keyword
      const key = fuzzyMatch(word, allKeywords);
      if (key) {
        matchedKeyword = key;
        if (key.toLowerCase() !== word)
          correctionNote = `Corrected "${word}" to "${key}".`;
        break;
      }
    }

    // If a mapped keyword is found, use its mapping
    if (matchedKeyword && KEYWORD_CATEGORY_MAP[matchedKeyword]) {
      const map = KEYWORD_CATEGORY_MAP[matchedKeyword];
      return {
        query: matchedKeyword,
        category: map.category,
        subcategory: map.subcategory,
        correctionNote,
      };
    }
    // If a main category is found
    if (matchedCategory) {
      return {
        query: matchedCategory,
        category: matchedCategory,
        correctionNote,
      };
    }
    // If a subcategory is found
    if (matchedSubcategory) {
      // Find the main category for this subcategory
      const mainCat = Object.entries(SUB_CATEGORIES).find(([main, subs]) =>
        (subs as unknown as string[]).includes(matchedSubcategory as string)
      )?.[0];
      return {
        query: matchedSubcategory,
        category: mainCat,
        subcategory: matchedSubcategory,
        correctionNote,
      };
    }

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

    // Detect explicit campus mention (e.g., 'at Stanford University')
    let campus: string | undefined;
    const atCampusMatch = message.match(/at ([A-Za-z ,.'-]+)/i);
    if (atCampusMatch) {
      const campusName = atCampusMatch[1].trim();
      // Try to match to a known campus
      const knownCampus = CAMPUS_LIST.find(
        (c) => c.toLowerCase() === campusName.toLowerCase()
      );
      if (knownCampus) campus = knownCampus;
      else campus = campusName;
    } else if (lowerMessage.includes("at my university") && userUniversity) {
      campus = userUniversity;
    }

    // 1. Check for category synonyms/phrases
    for (const [phrase, category] of Object.entries(CATEGORY_SYNONYMS)) {
      if (lowerMessage.includes(phrase)) {
        return {
          query: phrase,
          category,
          searchAllCampuses: searchAllCampuses || !myCampusOnly,
          campus,
        };
      }
    }

    // 2. Check for explicit search patterns
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

        // Check for synonyms in the query
        let synonymCategory: string | undefined;
        for (const [phrase, cat] of Object.entries(CATEGORY_SYNONYMS)) {
          if (query.toLowerCase().includes(phrase)) {
            synonymCategory = cat;
            break;
          }
        }

        return {
          query,
          category: synonymCategory || category,
          searchAllCampuses: searchAllCampuses || !myCampusOnly,
          campus,
        };
      }
    }

    // 3. Check for direct category mentions
    const category = MAIN_CATEGORIES.find((cat) =>
      lowerMessage.includes(cat.toLowerCase())
    );

    if (category) {
      return {
        query: category,
        category,
        searchAllCampuses: searchAllCampuses || !myCampusOnly,
        campus,
      };
    }

    // 4. Check for subcategory mentions
    for (const [mainCat, subCats] of Object.entries(SUB_CATEGORIES)) {
      const subCategory = subCats.find((sub) =>
        lowerMessage.includes(sub.toLowerCase())
      );
      if (subCategory) {
        return {
          query: subCategory,
          category: mainCat,
          subcategory: subCategory,
          searchAllCampuses: searchAllCampuses || !myCampusOnly,
          campus,
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
      // --- NEW: Intercept 'What is Capmus?' queries and return a fixed answer ---
      const capmusQuestionPatterns = [
        /^what is capmus[?]?$/i,
        /^tell me about capmus[?]?$/i,
        /^who is the founder of capmus[?]?$/i,
        /^who is the ceo of capmus[?]?$/i,
        /^describe capmus[?]?$/i,
        /^capmus info[?]?$/i,
      ];
      if (capmusQuestionPatterns.some((re) => re.test(userMessage.trim()))) {
        return `Capmus is an online marketplace for university students, especially Stanford, to buy, sell, and trade goods and services (housing, jobs, bikes, etc.).\nListings are verified for authenticity.\nUsers must have a @stanford.edu email address to post.\nThe founder and CEO is Greg Wientje.\nCapmus helps students connect safely and efficiently for campus-related transactions.\nThe platform is designed to foster a trusted community for students to exchange goods and services.\nCapmus is not affiliated with Stanford University but is built for the Stanford student community.`;
      }
      // --- END NEW ---

      // Get user context if not available
      let userContext = context.userInfo;
      if (!userContext?.university && context.userInfo?.id) {
        userContext = await this.getUserContext(context.userInfo.id);
      }

      // --- NEW: Check for 'my posts' or similar queries first ---
      const myPostsPhrases = [
        "my posts",
        "my post",
        "my listings",
        "my active listings",
        "my items",
        "show me my posts",
        "show my posts",
        "show me my listings",
        "show my listings",
        "my selling",
        "my sales",
        "my advertisements",
        "my ads",
      ];
      const lowerMessage = userMessage.toLowerCase();
      // Extract intent for campus
      const searchIntent = this.extractSearchIntent(
        userMessage,
        userContext?.university
      );
      if (
        myPostsPhrases.some((phrase) => lowerMessage.includes(phrase)) &&
        userContext?.id
      ) {
        // If campus is specified, filter by both seller_id and campus
        let userPostsQuery = supabase
          .from("posts")
          .select("*")
          .eq("seller_id", userContext.id)
          .order("created_at", { ascending: false });
        if (searchIntent?.campus) {
          userPostsQuery = userPostsQuery.eq("campus", searchIntent.campus);
        }
        const { data: userPosts, error } = await userPostsQuery;

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
          }\n\n💡 **Tip:** You can edit or delete your posts by clicking \"View Full Details\"`;
        } else {
          return "You don't have any active listings yet. Would you like to create your first post? I can guide you through the process!";
        }
      }
      // --- END NEW ---

      // Check if this is a search query (expanded detection)
      // (searchIntent already extracted above)

      // Also check for general item mentions even without explicit search keywords
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
        let correctionNote = "";

        // Extract search term from message if no explicit search intent
        let searchQuery = "";
        if (searchIntent) {
          if (searchIntent.correctionNote) {
            correctionNote = searchIntent.correctionNote;
          }
          // If the intent is a category synonym, don't use the phrase as a text search
          if (searchIntent.category && CATEGORY_SYNONYMS[searchIntent.query]) {
            searchQuery = "";
            filters.main_category = searchIntent.category;
          } else {
            searchQuery = searchIntent.query;
            if (searchIntent.category) {
              filters.main_category = searchIntent.category;
            }
          }
          if (searchIntent.campus) {
            filters.campus = searchIntent.campus;
          }
          if (searchIntent.subcategory) {
            filters.sub_category = searchIntent.subcategory;
          }
        } else {
          // Try to extract a strong keyword from the message
          const words = lowerMessage.split(/\s+/);
          const itemKeywords = [
            "tesla",
            "bike",
            "bikes",
            "bicycle",
            "house",
            "houses",
            "home",
            "homes",
            "job",
            "jobs",
            "electronics",
            "laptop",
            "phone",
            "car",
            "cars",
            "desk",
            "chair",
            "furniture",
            "textbook",
            "book",
            "books",
            "apartment",
            "apartments",
            "roommate",
            "sublet",
            "room",
            "rooms",
            "stanford",
            "berkeley",
            "harvard",
            "mit",
            // add more as needed
          ];
          const foundKeyword = words.find((word) =>
            itemKeywords.includes(word)
          );
          if (foundKeyword) {
            searchQuery = foundKeyword;
          } else {
            // fallback: use the first non-stopword as keyword
            searchQuery = words.find((w) => w.length > 3) || words[0] || "";
          }
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

        // If a correction was made, prepend a note to the response
        let correctionMsg = correctionNote ? `🔎 ${correctionNote}\n` : "";

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

          return `${correctionMsg}I found ${posts.length} matching item${
            posts.length > 1 ? "s" : ""
          }${searchScope}:\n\n${listings}\n\n${
            posts.length > 5
              ? `📊 **And ${posts.length - 5} more items available!**\n\n`
              : ""
          }💡 **Tip:** Click on \"View Full Details\" to see photos and contact the seller. Would you like to refine your search or see items from ${
            searchIntent?.searchAllCampuses === false
              ? "other campuses"
              : "your campus only"
          }?`;
        } else {
          const searchScope =
            searchIntent?.searchAllCampuses === false
              ? ` at ${userContext?.university}`
              : " in the entire marketplace";

          return `${correctionMsg}I couldn't find any "${searchQuery}" items${searchScope}. \n\nWould you like to:\n1. 🔍 Search all campuses? (if you haven't already)\n2. 📝 Create a new post to sell or request this item?\n3. 🔔 Set up an alert for when this item becomes available?\n\nJust let me know how I can help!`;
        }
      }

      // (Keep the old 'my post' check for backward compatibility, but it should never trigger now)
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
          }\n\n💡 **Tip:** You can edit or delete your posts by clicking \"View Full Details\"`;
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

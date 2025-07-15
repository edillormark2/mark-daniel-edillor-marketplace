// src/lib/chat-context.ts
import { ChatMessage, ChatContext, UserContext } from "./ai-agent";
import { MAIN_CATEGORIES, SUB_CATEGORIES, CAMPUS_LIST } from "./types";
import { supabase } from "./supabase";

export class ChatContextManager {
  private static MAX_CONTEXT_LENGTH = 20;

  static createMessage(
    role: "user" | "assistant",
    content: string
  ): ChatMessage {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
  }

  static addMessage(
    context: ChatContext,
    role: "user" | "assistant",
    content: string
  ): ChatContext {
    const newMessage = this.createMessage(role, content);
    const updatedMessages = [...context.messages, newMessage];

    // Keep only recent messages to avoid context overflow
    if (updatedMessages.length > this.MAX_CONTEXT_LENGTH) {
      updatedMessages.splice(
        0,
        updatedMessages.length - this.MAX_CONTEXT_LENGTH
      );
    }

    return {
      ...context,
      messages: updatedMessages,
    };
  }

  static async createInitialContext(
    userInfo?: UserContext
  ): Promise<ChatContext> {
    let enrichedUserInfo = userInfo;

    // Enrich user info with database data if user ID is available
    if (userInfo?.id) {
      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userInfo.id)
          .single();

        if (!profileError && profile) {
          // Get user's posts count
          const { data: userPosts, error: userPostsError } = await supabase
            .from("posts")
            .select("*")
            .eq("seller_id", userInfo.id);

          // Get university posts count if user has university
          let universityPostsCount = 0;
          if (profile.university) {
            const { data: universityPosts, error: universityError } =
              await supabase
                .from("posts")
                .select("*")
                .eq("campus", profile.university);

            if (!universityError && universityPosts) {
              universityPostsCount = universityPosts.length;
            }
          }

          enrichedUserInfo = {
            ...userInfo,
            username: profile.username,
            full_name: profile.full_name,
            university: profile.university,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            postsCount: userPosts?.length || 0,
            universityPostsCount,
          };
        }
      } catch (error) {
        console.error("Error enriching user context:", error);
      }
    }

    return {
      messages: [],
      userInfo: enrichedUserInfo,
      marketplaceInfo: {
        categories: [...MAIN_CATEGORIES],
        subcategories: SUB_CATEGORIES as Record<string, readonly string[]>,
        campuses: [...CAMPUS_LIST],
      },
    };
  }

  static clearContext(context: ChatContext): ChatContext {
    return {
      ...context,
      messages: [],
    };
  }

  static updateUserInfo(
    context: ChatContext,
    userInfo: UserContext
  ): ChatContext {
    return {
      ...context,
      userInfo,
    };
  }

  // Load conversation history from database
  static async loadChatHistory(
    sessionId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error loading chat history:", error);
        return [];
      }

      return data.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
    } catch (error) {
      console.error("Error in loadChatHistory:", error);
      return [];
    }
  }

  // Create context with loaded history
  static async createContextWithHistory(
    sessionId: string,
    userInfo?: UserContext
  ): Promise<ChatContext> {
    const initialContext = await this.createInitialContext(userInfo);
    const history = await this.loadChatHistory(sessionId);

    return {
      ...initialContext,
      messages: history,
      sessionId,
    };
  }
}

// src/lib/chat-service.ts
import { supabase } from "./supabase";
import { ChatSession, ChatMessage as DBChatMessage } from "./types";

export class ChatService {
  static async getOrCreateSession(userId: string): Promise<ChatSession | null> {
    try {
      // Check for existing active session
      const { data: existingSession, error: fetchError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing session:", fetchError);
        // Continue to create new session
      }

      if (existingSession) {
        return existingSession;
      }

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating new session:", createError);
        return null;
      }

      return newSession;
    } catch (error) {
      console.error("Error in getOrCreateSession:", error);
      return null;
    }
  }

  static async saveMessage(
    sessionId: string,
    userId: string,
    role: "user" | "assistant",
    content: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("chat_messages").insert({
        session_id: sessionId,
        user_id: userId,
        role,
        content,
        metadata,
      });

      if (error) {
        console.error("Error saving message:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in saveMessage:", error);
      return false;
    }
  }

  static async getChatHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<DBChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error fetching chat history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getChatHistory:", error);
      return [];
    }
  }

  static async clearSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ is_active: false })
        .eq("id", sessionId);

      if (error) {
        console.error("Error clearing session:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in clearSession:", error);
      return false;
    }
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Delete all messages in the session first
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("session_id", sessionId);

      if (messagesError) {
        console.error("Error deleting messages:", messagesError);
        return false;
      }

      // Delete the session
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteSession:", error);
      return false;
    }
  }

  static async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching user sessions:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getUserSessions:", error);
      return [];
    }
  }

  static async getSessionStats(sessionId: string): Promise<{
    messageCount: number;
    firstMessage?: string;
    lastMessage?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("created_at, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching session stats:", error);
        return { messageCount: 0 };
      }

      const messages = data || [];
      return {
        messageCount: messages.length,
        firstMessage: messages[0]?.created_at,
        lastMessage: messages[messages.length - 1]?.created_at,
      };
    } catch (error) {
      console.error("Error in getSessionStats:", error);
      return { messageCount: 0 };
    }
  }
}

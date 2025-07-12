// src/lib/messages.ts
import { supabase } from "./supabase";

export interface MessageData {
  post_id: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  message: string;
  sender_name?: string;
  sender_email?: string;
  post_title?: string;
}

export interface SendMessageResponse {
  data?: any;
  error?: string;
}

export class MessageService {
  static async sendMessage(
    messageData: MessageData
  ): Promise<SendMessageResponse> {
    try {
      console.log("Starting message send process...");

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Auth error:", authError);
        return { error: "Authentication required" };
      }

      console.log("User authenticated:", user.id);

      // Get sender profile information
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        return { error: "Failed to get sender information" };
      }

      const senderName = profile.full_name || "Campus Marketplace User";
      const senderEmail = profile.email || user.email;

      console.log("Sender info retrieved:", { senderName, senderEmail });

      // Save message to database using your existing schema
      const { data: dbMessage, error: dbError } = await supabase
        .from("messages")
        .insert({
          post_id: messageData.post_id,
          sender_id: user.id,
          sender_email: senderEmail,
          sender_name: senderName,
          recipient_id: messageData.recipient_id,
          recipient_email: messageData.recipient_email,
          subject: messageData.subject,
          message: messageData.message,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        return { error: "Failed to save message to database" };
      }

      console.log("Message saved to database:", dbMessage.id);

      // Get the current session to include in the API call
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return { error: "Authentication session required" };
      }

      console.log("Session retrieved, sending email...");

      // Send email via API route with proper authentication
      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: messageData.recipient_email,
          subject: messageData.subject,
          message: messageData.message,
          senderName: senderName,
          senderEmail: senderEmail,
          postTitle: messageData.post_title,
        }),
      });

      console.log("Email API response status:", emailResponse.status);

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Email API response not ok:", {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          body: errorText,
        });

        // Try to parse as JSON, fallback to text
        let emailResult;
        try {
          emailResult = JSON.parse(errorText);
        } catch {
          emailResult = { error: errorText || "Failed to send email" };
        }

        return { error: emailResult.error || "Failed to send email" };
      }

      const emailResult = await emailResponse.json();
      console.log("Email sent successfully:", emailResult);

      return {
        data: {
          message: "Message sent successfully",
          emailId: emailResult.emailId,
          dbMessageId: dbMessage?.id,
        },
      };
    } catch (error) {
      console.error("Message sending error:", error);
      return { error: "Failed to send message" };
    }
  }

  // ... keep existing code (getMessageHistory, getPostMessages, getConversation methods)
  static async getMessageHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          post:posts(title, price, main_category, sub_category)
        `
        )
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      console.error("Error fetching message history:", error);
      return { error: "Failed to fetch message history" };
    }
  }

  static async getPostMessages(postId: string) {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { error: "Authentication required" };
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("post_id", postId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      console.error("Error fetching post messages:", error);
      return { error: "Failed to fetch post messages" };
    }
  }

  static async getConversation(postId: string, otherUserId: string) {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { error: "Authentication required" };
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("post_id", postId)
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return { error: "Failed to fetch conversation" };
    }
  }
}

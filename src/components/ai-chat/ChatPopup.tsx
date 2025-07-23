// src/components/ai-chat/ChatPopup.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  RotateCcw,
  MessageCircle,
  X,
  Sparkles,
} from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";

interface ChatPopupProps {
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Utility to generate recommended prompts based on last user message
function getRecommendedPrompts(lastUserMessage: string, userProfile: any) {
  const lower = lastUserMessage.toLowerCase();
  const university = userProfile?.university || "my university";
  // Housing
  if (lower.includes("housing")) {
    return [
      {
        text: `Show me housing options at ${university}`,
        query: userProfile?.university
          ? `Find housing options at ${userProfile.university}`
          : "Find housing options at my university",
      },
      {
        text: "Show me all housing options across all campuses",
        query: "Show me all available housing options across all campuses",
      },
      {
        text: "Show me the most recent housing posts",
        query: "Show me the most recent housing posts",
      },
    ];
  }
  // Campus Jobs
  if (lower.includes("campus job") || lower.includes("student job")) {
    return [
      {
        text: "Show me part-time campus jobs",
        query: "Show me part-time campus jobs",
      },
      {
        text: "Show me full-time campus jobs",
        query: "Show me full-time campus jobs",
      },
      {
        text: `Show me campus jobs at ${university}`,
        query: userProfile?.university
          ? `Show me campus jobs at ${userProfile.university}`
          : "Show me campus jobs at my university",
      },
    ];
  }
  // For Sale
  if (
    lower.includes("for sale") ||
    lower.includes("recent items") ||
    lower.includes("latest items")
  ) {
    return [
      {
        text: "Show me electronics for sale",
        query: "Show me electronics for sale",
      },
      {
        text: "Show me furniture for sale",
        query: "Show me furniture for sale",
      },
      {
        text: "Show me the most recent items posted for sale",
        query: "Show me the most recent items posted for sale",
      },
    ];
  }
  // My posts
  if (lower.includes("my post") || lower.includes("my listing")) {
    return [
      {
        text: "Show me my posts",
        query: "Show me my posts",
      },
      {
        text: "Show me my active listings",
        query: "Show me my active listings",
      },
      {
        text: "Show me my posts at my university",
        query: userProfile?.university
          ? `Show me my posts at ${userProfile.university}`
          : "Show me my posts at my university",
      },
    ];
  }
  // Default/fallback
  return [
    {
      text: "Show me the most recent items posted for sale",
      query: "Show me the most recent items posted for sale",
    },
    {
      text: "Show me housing options",
      query: "Show me all available housing options across all campuses",
    },
    {
      text: "What campus jobs are available?",
      query: "What campus jobs are available?",
    },
  ];
}

export default function ChatPopup({ onClose }: ChatPopupProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user profile and chat history on mount
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        // Load user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && profile) {
          setUserProfile(profile);
        }

        // Load chat history
        await loadChatHistory();
      } else {
        setIsLoadingHistory(false);
      }
    };

    loadData();
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) {
      setIsLoadingHistory(false);
      return;
    }

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIsLoadingHistory(false);
        return;
      }

      // Load existing messages
      const response = await fetch("/api/ai-chat/history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
          );
          setSessionId(data.sessionId);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    if (!user) {
      setError("Please sign in to use the chat assistant.");
      return;
    }

    setError(null);
    setIsLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session. Please sign in again.");
      }

      // Prepare request body
      const requestBody = {
        message,
        sessionId: sessionId || null, // Explicit null if undefined
      };

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("API Error:", responseData);
        throw new Error(
          responseData.error?.message ||
            responseData.error ||
            "Failed to send message. Please try again."
        );
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        content: responseData.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (responseData.sessionId) {
        setSessionId(responseData.sessionId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!user || !sessionId) {
      setMessages([]);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await fetch("/api/ai-chat", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      setMessages([]);
      setSessionId(null);
      setError(null);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  // Enhanced starter suggestions
  const starterSuggestions = user
    ? [
        {
          emoji: "❓",
          text: "What is Capmus?",
          query: "What is Capmus?",
        },
        {
          emoji: "🏠",
          text: "Search housing options everywhere",
          query: "Show me all available housing options across all campuses",
        },
        {
          emoji: "💼",
          text: "Browse campus jobs",
          query: "What campus jobs are available?",
        },
        {
          emoji: "📱",
          text: "Latest items for sale",
          query: "Show me the most recent items posted for sale",
        },
        {
          emoji: "📋",
          text: "View my active listings",
          query: "Show me my posts",
        },
      ]
    : [];

  return (
    <div className="fixed bottom-24 right-6 z-40 w-[400px] h-[600px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {user ? (
              <Avatar
                email={user.email}
                size="sm"
                className="border-2 border-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-1">
              Campus Marketplace AI
              <Sparkles className="w-4 h-4" />
            </h3>
            <p className="text-xs opacity-90">
              {user
                ? `Hi, ${userProfile?.full_name || user.email?.split("@")[0]}!`
                : "Your marketplace assistant"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-1 hover:bg-blue-800/50 rounded transition-colors"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-800/50 rounded transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Info Note */}
      <div className="bg-blue-50 text-blue-700 text-xs px-4 py-2 border-b border-blue-100">
        Note: Capmus AI Assistant is under development and training. Some
        details may not be fully accurate.
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <div className="text-sm">
              {user ? (
                <>
                  <p className="font-medium text-gray-700 mb-1">
                    Welcome to Campus Marketplace AI! 🎯
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    I can help you find items across all campuses or just at{" "}
                    {userProfile?.university || "your university"}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span>Please sign in to use the marketplace assistant.</span>
                  <Link
                    href="/auth"
                    className="text-sm px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
            {user && starterSuggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                <div className="grid grid-cols-2 gap-2">
                  {starterSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion.query)}
                      className="text-left text-xs bg-white hover:bg-gray-100 p-3 rounded-lg transition-colors border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{suggestion.emoji}</span>
                        <span className="flex-1 leading-tight text-gray-700">
                          {suggestion.text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div key={message.id}>
                <ChatMessage message={message} userEmail={user?.email} />
                {/* Remove recommended prompts after assistant message */}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 bg-white p-3 rounded-lg shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  Finding the best results for you...
                </span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!user}
        />
      </div>
    </div>
  );
}

// src/components/ai-chat/ChatPopup.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw, MessageCircle, X } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/ui/Avatar";

interface ChatPopupProps {
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

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
      // Optionally keep the user message even if there was an error
      // setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
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

  return (
    <div className="fixed bottom-24 right-6 z-40 w-[400px] h-[550px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <Avatar
              email={user.email}
              size="sm"
              className="border-2 border-white/20"
            />
          )}
          <div>
            <h3 className="font-semibold">Capmus Assistant</h3>
            <p className="text-xs opacity-90">
              {user
                ? `Hi, ${userProfile?.full_name || user.email?.split("@")[0]}!`
                : "Ask me anything!"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            aria-label="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              {user
                ? "Hi! How can I help you today?"
                : "Please sign in to use the chat assistant."}
            </p>
            {user && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => handleSendMessage("How do I post an item?")}
                  className="block w-full text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded transition-colors"
                >
                  💡 How do I post an item?
                </button>
                <button
                  onClick={() => handleSendMessage("Show me my recent posts")}
                  className="block w-full text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded transition-colors"
                >
                  📋 Show me my recent posts
                </button>
                <button
                  onClick={() => handleSendMessage("Find electronics for sale")}
                  className="block w-full text-left text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded transition-colors"
                >
                  🔍 Find electronics for sale
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userEmail={user?.email}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                {error}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        disabled={!user}
      />
    </div>
  );
}

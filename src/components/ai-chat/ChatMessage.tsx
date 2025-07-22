// src/components/ai-chat/ChatMessage.tsx
"use client";

import { Bot, ExternalLink } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";
import React from "react";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  };
  userEmail?: string;
}

export default function ChatMessage({ message, userEmail }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Function to parse and render the message content
  const renderMessageContent = (content: string) => {
    // Split content into lines
    const lines = content.split("\n");

    return lines.map((line, index) => {
      // Check for horizontal rule
      if (line.trim() === "---") {
        return <hr key={index} className="my-3 border-gray-300" />;
      }

      // Check for post link pattern
      const linkMatch = line.match(/🔗\s*\[([^\]]+)\]\(\/post\/([a-f0-9-]+)\)/);
      if (linkMatch) {
        const [, linkText, postId] = linkMatch;
        return (
          <div key={index} className="mt-2 mb-3">
            <Link
              href={`/post/${postId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
            >
              {linkText}
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        );
      }

      // Process other formatting
      let processedLine = line
        // Bold text
        .replace(
          /\*\*([^*]+)\*\*/g,
          '<strong class="font-semibold">$1</strong>'
        )
        // Emojis - make them slightly larger
        .replace(
          /(📦|💰|📍|📅|📷|📝|📊|💡|🔍|🔗)/g,
          '<span class="text-lg inline-block mr-1">$1</span>'
        );

      return (
        <div
          key={index}
          className="mb-1"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""} mb-4`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div
        className={`flex flex-col ${
          isUser ? "max-w-[75%]" : "flex-1 max-w-full"
        }`}
      >
        <div
          className={`p-4 rounded-lg ${
            isUser
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-gray-800 shadow-sm border border-gray-200"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="text-sm space-y-1">
              {renderMessageContent(message.content)}
            </div>
          )}
        </div>
        <p
          className={`text-xs text-gray-400 mt-1 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <Avatar email={userEmail} size="sm" />
        </div>
      )}
    </div>
  );
}

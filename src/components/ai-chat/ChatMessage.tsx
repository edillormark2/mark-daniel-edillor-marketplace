//  src/components/ai-chat/ChatMessage.tsx
"use client";

import { Bot } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  };
  userEmail?: string;
}

// Enhanced markdown renderer component
function MarkdownRenderer({ content }: { content: string }) {
  const renderContent = (text: string) => {
    // Split by code blocks first
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: "codeblock",
        content: match[1].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return parts.map((part, index) => {
      if (part.type === "codeblock") {
        return (
          <pre
            key={index}
            className="bg-gray-800 text-green-400 p-3 rounded-md my-2 overflow-x-auto"
          >
            <code className="text-sm">{part.content}</code>
          </pre>
        );
      }

      // Process text content with proper line handling
      return (
        <div
          key={index}
          dangerouslySetInnerHTML={{ __html: processTextContent(part.content) }}
        />
      );
    });
  };

  const processTextContent = (text: string) => {
    // Split text into lines to handle bullets properly
    const lines = text.split("\n");
    const processedLines = lines.map((line) => {
      // Check if line is a bullet point
      const bulletMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch) {
        const [, indent, bullet, content] = bulletMatch;
        const indentLevel = Math.floor(indent.length / 2); // 2 spaces per indent level
        const marginLeft = indentLevel * 20; // 20px per level
        return `<div class="flex items-start" style="margin-left: ${marginLeft}px; margin-bottom: 4px;">
          <span class="text-gray-600 mr-2 mt-1">•</span>
          <span class="flex-1">${processInlineFormatting(content)}</span>
        </div>`;
      }

      // Check if line is a numbered list
      const numberedMatch = line.match(/^(\s*)(\d+\.)\s+(.*)$/);
      if (numberedMatch) {
        const [, indent, number, content] = numberedMatch;
        const indentLevel = Math.floor(indent.length / 2);
        const marginLeft = indentLevel * 20;
        return `<div class="flex items-start" style="margin-left: ${marginLeft}px; margin-bottom: 4px;">
          <span class="text-gray-600 mr-2 mt-1 min-w-6">${number}</span>
          <span class="flex-1">${processInlineFormatting(content)}</span>
        </div>`;
      }

      // Regular line
      return line.trim()
        ? `<p class="mb-2">${processInlineFormatting(line)}</p>`
        : "";
    });

    return processedLines.join("");
  };

  const processInlineFormatting = (text: string) => {
    return (
      text
        // Inline code first (to avoid conflicts with other formatting)
        .replace(
          /`([^`]+)`/g,
          '<code class="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
        )
        // Links: [text](url)
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        // Bold: **text** or __text__ (non-greedy)
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
        .replace(/__([^_]+)__/g, '<strong class="font-bold">$1</strong>')
        // Italic: *text* or _text_ (non-greedy, avoiding conflict with bold)
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
        .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>')
        // Underline: ~~text~~
        .replace(/~~([^~]+)~~/g, '<span class="line-through">$1</span>')
        // Escape any remaining asterisks that weren't processed
        .replace(/\*/g, "•")
    );
  };

  return (
    <div className="text-sm text-left prose prose-sm max-w-none">
      {renderContent(content)}
    </div>
  );
}

export default function ChatMessage({ message, userEmail }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {/* Bot Avatar - only shown for AI messages */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? "max-w-[75%]" : "w-full"}`}>
        <div
          className={`p-3 rounded-lg ${
            isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words text-left">
              {message.content}
            </p>
          ) : (
            <MarkdownRenderer content={message.content} />
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

      {/* User Avatar - only shown for user messages */}
      {isUser && (
        <div className="flex-shrink-0">
          <Avatar email={userEmail} size="sm" />
        </div>
      )}
    </div>
  );
}

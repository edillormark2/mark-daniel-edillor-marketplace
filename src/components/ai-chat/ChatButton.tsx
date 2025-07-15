// src/components/ai-chat/ChatButton.tsx
"use client";

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import ChatPopup from "./ChatPopup";

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110"
        aria-label="Open chat support"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat Popup */}
      {isOpen && <ChatPopup onClose={() => setIsOpen(false)} />}
    </>
  );
}

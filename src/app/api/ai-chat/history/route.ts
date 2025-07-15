// src/app/api/ai-chat/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { ChatService } from "@/lib/chat-service";

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(token);

    // Get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active session
    const session = await ChatService.getOrCreateSession(user.id);
    if (!session) {
      return NextResponse.json({ messages: [], sessionId: null });
    }

    // Get chat history
    const messages = await ChatService.getChatHistory(session.id, 50);

    return NextResponse.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
      })),
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}

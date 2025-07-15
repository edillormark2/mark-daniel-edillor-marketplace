// src/app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AIAgent, ChatContext } from "@/lib/ai-agent";
import { ChatContextManager } from "@/lib/chat-context";
import { ChatService } from "@/lib/chat-service";
import { createClient } from "@/lib/server";
import { z } from "zod";

// Request validation schema
// Updated schema in src/app/api/ai-chat/route.ts
const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().nullable().optional(), // Make sessionId optional and nullable
});

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // 20 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(token);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Request validation
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validationResult = chatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { message, sessionId } = validationResult.data;

    // Session handling
    const session = await ChatService.getOrCreateSession(user.id);
    if (!session) {
      return NextResponse.json(
        { error: "Failed to create chat session" },
        { status: 500 }
      );
    }

    // Get chat history
    const chatHistory = await ChatService.getChatHistory(session.id);

    // User context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const userContext = {
      id: user.id,
      email: user.email || "",
      username: profile?.username,
      full_name: profile?.full_name,
      university: profile?.university,
      created_at: user.created_at,
      lastActive: new Date().toISOString(),
      postsCount: 0, // Will be updated in createInitialContext
    };

    // Build chat context
    const initialContext = await ChatContextManager.createInitialContext(
      userContext
    );
    const contextWithHistory: ChatContext = {
      ...initialContext,
      messages: chatHistory.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      })),
      sessionId: session.id,
    };

    // Add user message to context
    const updatedContext = ChatContextManager.addMessage(
      contextWithHistory,
      "user",
      message
    );

    // Save user message to database
    await ChatService.saveMessage(session.id, user.id, "user", message);

    // Process with AI
    const response = await AIAgent.processMessage(message, updatedContext);

    // Save assistant response
    await ChatService.saveMessage(session.id, user.id, "assistant", response);

    return NextResponse.json({
      response,
      sessionId: session.id,
      userInfo: {
        email: user.email,
        name: profile?.full_name || profile?.username,
      },
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Clear chat session endpoint
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(token);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (sessionId) {
      await ChatService.clearSession(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear chat error:", error);
    return NextResponse.json(
      { error: "Failed to clear chat" },
      { status: 500 }
    );
  }
}

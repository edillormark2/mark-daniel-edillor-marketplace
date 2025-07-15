// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024,
  },
});

export interface GeminiResponse {
  text: string;
  error?: string;
}

export async function generateGeminiResponse(
  prompt: string
): Promise<GeminiResponse> {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return { text };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      text: "",
      error: "Failed to generate response. Please try again.",
    };
  }
}

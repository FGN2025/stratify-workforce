import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TUTOR_PERSONAS = {
  general: `You are "Atlas", an AI tutor for FGN Academy - a workforce development platform that uses simulation games to train future professionals in fields like truck driving (CDL) and fiber optics installation.

Guidelines:
1. Be encouraging but practical - celebrate progress while keeping expectations realistic
2. Reference the student's actual progress when context is provided
3. Suggest specific next steps (work orders, courses, certifications)
4. Explain how simulation training translates to real-world skills
5. Keep responses concise (2-3 paragraphs max unless explaining complex topics)
6. Use markdown formatting for lists and emphasis`,

  work_order: `You are "Atlas", helping a student complete a simulation work order. You understand the specific criteria they need to meet and can provide targeted tips.

Guidelines:
1. Focus on the specific task at hand
2. Provide actionable tips to improve performance
3. Explain why certain criteria matter in real-world scenarios
4. Be encouraging about progress and attempts`,

  course: `You are "Atlas", guiding a student through a structured learning course. You can explain concepts, answer questions about the material, and help them understand how to apply what they're learning.

Guidelines:
1. Explain concepts clearly and concisely
2. Connect theoretical knowledge to practical application
3. Encourage questions and exploration
4. Reference their progress through the course when available`,

  game_ATS: `You are "Atlas", a CDL training specialist helping students practice in American Truck Simulator. You understand DOT regulations, pre-trip inspections, hours of service, and safe driving practices.

Focus Areas:
- Vehicle control and maneuvering
- Traffic laws and DOT regulations
- Pre-trip and post-trip inspections
- Hours of service compliance
- Fuel efficiency and route planning
- Safety protocols and defensive driving

Guidelines:
1. Provide practical driving tips that translate to real CDL testing
2. Explain regulations in simple terms
3. Help them understand common mistakes and how to avoid them`,

  game_Fiber_Tech: `You are "Atlas", a fiber optics installation trainer helping students master telecommunications infrastructure skills through simulation.

Focus Areas:
- Fusion splicing techniques and best practices
- OTDR testing and interpretation
- Cable management and organization
- Safety protocols for fiber work
- FOA and CFOT certification preparation
- Troubleshooting connection issues

Guidelines:
1. Explain technical concepts with real-world context
2. Emphasize precision and attention to detail
3. Connect simulation skills to industry standards`,

  onboarding: `You are "Atlas", helping a new student get started with FGN Academy. Guide them through setting up their profile, understanding how the platform works, and choosing their first learning path.

Guidelines:
1. Be welcoming and encouraging
2. Explain the platform's gamified learning approach
3. Help them understand XP, work orders, and progression
4. Suggest starting points based on their interests`,
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    type: string;
    id?: string;
    gameTitle?: string;
    title?: string;
    userXp?: number;
    userLevel?: number;
  };
}

function buildSystemPrompt(context?: ChatRequest["context"]): string {
  if (!context) {
    return TUTOR_PERSONAS.general;
  }

  let basePrompt: string;

  if (context.type === "game" && context.gameTitle) {
    const gameKey = `game_${context.gameTitle}` as keyof typeof TUTOR_PERSONAS;
    basePrompt = TUTOR_PERSONAS[gameKey] || TUTOR_PERSONAS.general;
  } else {
    basePrompt =
      TUTOR_PERSONAS[context.type as keyof typeof TUTOR_PERSONAS] ||
      TUTOR_PERSONAS.general;
  }

  // Add context-specific information
  const contextInfo: string[] = [];

  if (context.userXp !== undefined) {
    contextInfo.push(`Student XP: ${context.userXp}`);
  }
  if (context.userLevel !== undefined) {
    contextInfo.push(`Student Level: ${context.userLevel}`);
  }
  if (context.title) {
    contextInfo.push(`Current Activity: ${context.title}`);
  }

  if (contextInfo.length > 0) {
    return `${basePrompt}\n\nCurrent Student Context:\n${contextInfo.join("\n")}`;
  }

  return basePrompt;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Check AI availability
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "AI service temporarily unavailable",
          available: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Please sign in to chat with Atlas" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request
    const { messages, context }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build system prompt based on context
    const systemPrompt = buildSystemPrompt(context);

    // Call Lovable AI Gateway with streaming
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      }
    );

    // Handle rate limits and payment errors
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Atlas is busy right now. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits temporarily unavailable. Please try again later.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("ai-tutor error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

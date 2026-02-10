import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded fallback personas (used if DB has no config)
const FALLBACK_PERSONAS: Record<string, string> = {
  general: `You are "Atlas", an AI tutor for FGN Academy - a workforce development platform that uses simulation games to train future professionals in fields like truck driving (CDL) and fiber optics installation.

Guidelines:
1. Be encouraging but practical
2. Reference the student's actual progress when context is provided
3. Suggest specific next steps (work orders, courses, certifications)
4. Keep responses concise (2-3 paragraphs max unless explaining complex topics)
5. Use markdown formatting for lists and emphasis`,
  research: `You are "Atlas" in research mode. Provide thorough, detailed answers drawing on broad knowledge.`,
};

const FALLBACK_MODEL = "google/gemini-3-flash-preview";

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

interface PersonaConfig {
  system_prompt: string;
  model_override: string | null;
}

interface ModelConfig {
  model_id: string;
  is_default: boolean;
  use_for: string[];
}

async function getPersonaFromDB(
  supabaseAdmin: ReturnType<typeof createClient>,
  contextType: string,
  gameTitle?: string
): Promise<PersonaConfig | null> {
  // Try game-specific persona first
  if (contextType === "game" && gameTitle) {
    const gameKey = `game_${gameTitle}`;
    const { data } = await supabaseAdmin
      .from("ai_persona_configs")
      .select("system_prompt, model_override")
      .eq("context_type", gameKey)
      .eq("is_active", true)
      .single();
    if (data) return data;
  }

  // Try context type directly
  const { data } = await supabaseAdmin
    .from("ai_persona_configs")
    .select("system_prompt, model_override")
    .eq("context_type", contextType)
    .eq("is_active", true)
    .single();

  return data || null;
}

async function getModelFromDB(
  supabaseAdmin: ReturnType<typeof createClient>,
  useFor: string,
  modelOverride?: string | null
): Promise<string> {
  // If persona has a model override, use it
  if (modelOverride) {
    const { data } = await supabaseAdmin
      .from("ai_model_configs")
      .select("model_id")
      .eq("model_id", modelOverride)
      .eq("is_enabled", true)
      .single();
    if (data) return data.model_id;
  }

  // Find enabled models matching use_for, prefer default
  const { data: models } = await supabaseAdmin
    .from("ai_model_configs")
    .select("model_id, is_default, use_for")
    .eq("is_enabled", true);

  if (!models || models.length === 0) return FALLBACK_MODEL;

  // Filter by use_for
  const matching = models.filter(
    (m: ModelConfig) => m.use_for.includes(useFor) || m.use_for.includes("all")
  );

  // Prefer default
  const defaultModel = matching.find((m: ModelConfig) => m.is_default);
  if (defaultModel) return defaultModel.model_id;

  // Return first matching or fallback
  return matching[0]?.model_id || FALLBACK_MODEL;
}

function buildSystemPrompt(
  basePrompt: string,
  context?: ChatRequest["context"]
): string {
  if (!context) return basePrompt;

  const contextInfo: string[] = [];
  if (context.userXp !== undefined) contextInfo.push(`Student XP: ${context.userXp}`);
  if (context.userLevel !== undefined) contextInfo.push(`Student Level: ${context.userLevel}`);
  if (context.title) contextInfo.push(`Current Activity: ${context.title}`);

  if (contextInfo.length > 0) {
    return `${basePrompt}\n\nCurrent Student Context:\n${contextInfo.join("\n")}`;
  }
  return basePrompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable", available: false }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Please sign in to chat with Atlas" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, context }: ChatRequest = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for reading config
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const contextType = context?.type || "general";
    const useFor = contextType === "research" ? "research" : "tutor";

    // Get persona config from DB (with fallback)
    const personaConfig = await getPersonaFromDB(supabaseAdmin, contextType, context?.gameTitle);
    const basePrompt = personaConfig?.system_prompt || FALLBACK_PERSONAS[contextType] || FALLBACK_PERSONAS.general;
    const systemPrompt = buildSystemPrompt(basePrompt, context);

    // Get model from DB (with fallback)
    const model = await getModelFromDB(supabaseAdmin, useFor, personaConfig?.model_override);

    // Call AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Atlas is busy right now. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

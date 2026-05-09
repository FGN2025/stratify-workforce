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
  notebook_url: string | null;
}

interface ModelConfig {
  model_id: string;
  is_default: boolean;
  use_for: string[];
  api_key_encrypted: string | null;
}

async function getPersonaFromDB(
  supabaseAdmin: ReturnType<typeof createClient>,
  contextType: string,
  gameTitle?: string
): Promise<PersonaConfig | null> {
  // Try game-specific persona first
  if (gameTitle) {
    const gameKey = `game_${gameTitle}`;
    const { data } = await supabaseAdmin
      .from("ai_persona_configs")
      .select("system_prompt, model_override, notebook_url")
      .eq("context_type", gameKey)
      .eq("is_active", true)
      .single();
    if (data) return data;
  }

  // Try context type directly
  const { data } = await supabaseAdmin
    .from("ai_persona_configs")
    .select("system_prompt, model_override, notebook_url")
    .eq("context_type", contextType)
    .eq("is_active", true)
    .single();

  return data || null;
}

async function getModelFromDB(
  supabaseAdmin: ReturnType<typeof createClient>,
  useFor: string,
  modelOverride?: string | null
): Promise<{ modelId: string; apiKey: string | null }> {
  // If persona has a model override, use it
  if (modelOverride) {
    const { data } = await supabaseAdmin
      .from("ai_model_configs")
      .select("model_id, api_key_encrypted")
      .eq("model_id", modelOverride)
      .eq("is_enabled", true)
      .single();
    if (data) return { modelId: data.model_id, apiKey: data.api_key_encrypted };
  }

  // Find enabled models matching use_for, prefer default
  const { data: models } = await supabaseAdmin
    .from("ai_model_configs")
    .select("model_id, is_default, use_for, api_key_encrypted")
    .eq("is_enabled", true);

  if (!models || models.length === 0) return { modelId: FALLBACK_MODEL, apiKey: null };

  const matching = models.filter(
    (m: ModelConfig) => m.use_for.includes(useFor) || m.use_for.includes("all")
  );

  const defaultModel = matching.find((m: ModelConfig) => m.is_default);
  if (defaultModel) return { modelId: defaultModel.model_id, apiKey: defaultModel.api_key_encrypted };

  const first = matching[0];
  return first
    ? { modelId: first.model_id, apiKey: first.api_key_encrypted }
    : { modelId: FALLBACK_MODEL, apiKey: null };
}

interface NotebookResult {
  answer: string;
  citations: string[];
}

async function queryNotebook(
  question: string,
  notebookId: string
): Promise<NotebookResult | null> {
  const apiUrl = Deno.env.get("OPEN_NOTEBOOK_API_URL");
  const apiPassword = Deno.env.get("OPEN_NOTEBOOK_API_PASSWORD");
  if (!apiUrl || !apiPassword) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Password": apiPassword,
      },
      body: JSON.stringify({
        question,
        notebook_id: notebookId,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Open Notebook /ask returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    // Open Notebook /ask returns { answer, sources?: [{title, url}] } or similar
    const answer: string = data.answer || data.result || data.response || "";
    const sources = data.sources || data.citations || [];
    const citations: string[] = Array.isArray(sources)
      ? sources.map((s: any) =>
          typeof s === "string" ? s : s.title || s.url || s.source || JSON.stringify(s)
        )
      : [];

    if (!answer) return null;
    return { answer, citations };
  } catch (err) {
    console.warn("Open Notebook query failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function buildSystemPrompt(
  basePrompt: string,
  context?: ChatRequest["context"],
  notebookId?: string | null,
  notebookResult?: NotebookResult | null
): string {
  let prompt = basePrompt;

  // Inject retrieved knowledge from Open Notebook
  if (notebookResult && notebookResult.answer) {
    prompt += `\n\n=== KNOWLEDGE BASE CONTEXT (from Open Notebook) ===\n${notebookResult.answer}`;
    if (notebookResult.citations.length > 0) {
      prompt += `\n\nSources:\n${notebookResult.citations.map((c, i) => `[${i + 1}] ${c}`).join("\n")}`;
    }
    prompt += `\n=== END KNOWLEDGE BASE ===\n\nUse the above grounded knowledge to inform your answer when relevant. Cite sources by number when you reference them.`;
  } else if (notebookId) {
    prompt += `\n\nA curated knowledge base is available for this simulation. Provide authoritative guidance based on standard industry practice.`;
  }

  if (!context) return prompt;

  const contextInfo: string[] = [];
  if (context.userXp !== undefined) contextInfo.push(`Student XP: ${context.userXp}`);
  if (context.userLevel !== undefined) contextInfo.push(`Student Level: ${context.userLevel}`);
  if (context.title) contextInfo.push(`Current Activity: ${context.title}`);
  if (context.gameTitle) contextInfo.push(`Current SIM: ${context.gameTitle}`);

  if (contextInfo.length > 0) {
    return `${prompt}\n\nCurrent Student Context:\n${contextInfo.join("\n")}`;
  }
  return prompt;
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

    // Validate JWT before consuming any AI credits
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
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

    // If a notebook_id is configured for this persona, query Open Notebook for grounded context
    let notebookResult: NotebookResult | null = null;
    const notebookId = personaConfig?.notebook_url || null;
    const notebookConfigured = !!(Deno.env.get("OPEN_NOTEBOOK_API_URL") && Deno.env.get("OPEN_NOTEBOOK_API_PASSWORD"));
    if (notebookId && !notebookConfigured) {
      console.warn(`[notebook] persona has notebook_id but OPEN_NOTEBOOK_API_URL/PASSWORD not configured — skipping RAG (context=${contextType}, game=${context?.gameTitle ?? "-"})`);
    }
    if (notebookId && notebookConfigured) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
      if (lastUserMessage?.content) {
        const t0 = Date.now();
        const query = context?.gameTitle
          ? `[${context.gameTitle}] ${lastUserMessage.content}`
          : lastUserMessage.content;
        notebookResult = await queryNotebook(query, notebookId);
        const ms = Date.now() - t0;
        console.log(`[notebook] context=${contextType} game=${context?.gameTitle ?? "-"} notebook=${notebookId} status=${notebookResult ? "ok" : "miss"} citations=${notebookResult?.citations.length ?? 0} ms=${ms}`);
      }
    } else if (!notebookId) {
      console.log(`[notebook] context=${contextType} game=${context?.gameTitle ?? "-"} status=skipped reason=no_notebook_id`);
    }

    const systemPrompt = buildSystemPrompt(basePrompt, context, notebookId, notebookResult);

    // Get model from DB (with fallback)
    const { modelId: model, apiKey: modelApiKey } = await getModelFromDB(supabaseAdmin, useFor, personaConfig?.model_override);

    // Use model-specific API key if available, otherwise fall back to LOVABLE_API_KEY
    const effectiveApiKey = modelApiKey || LOVABLE_API_KEY;

    // Call AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${effectiveApiKey}`,
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

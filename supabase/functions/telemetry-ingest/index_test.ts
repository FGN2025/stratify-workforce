import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Create unique email each test run
function makeTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

Deno.test("telemetry-ingest: rejects unauthenticated requests", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/telemetry-ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", game_title: "ATS", data: {} }),
  });
  
  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.error, "Missing authorization header");
});

Deno.test({
  name: "telemetry-ingest: rejects invalid game_title",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: makeTestEmail(),
      password: "test123456",
    });
    
    if (error || !signUpData?.session) {
      console.log("Skipping - could not create user:", error?.message || "no session");
      return;
    }
    
    const token = signUpData.session.access_token;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/telemetry-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "start", game_title: "InvalidGame", data: {} }),
    });
    
    assertEquals(response.status, 400);
    const data = await response.json();
    assertEquals(data.error, "Invalid game_title");
  },
});

Deno.test({
  name: "telemetry-ingest: full session lifecycle (start -> update -> complete)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: makeTestEmail(),
      password: "test123456",
    });
    
    if (error || !signUpData?.session) {
      console.log("Skipping - could not create user:", error?.message || "no session");
      return;
    }
    
    const token = signUpData.session.access_token;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
    
    // 1. Start session
    const startResponse = await fetch(`${SUPABASE_URL}/functions/v1/telemetry-ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "start",
        game_title: "ATS",
        data: { raw: { initial: true } },
      }),
    });
    
    assertEquals(startResponse.status, 200);
    const startData = await startResponse.json();
    assertEquals(startData.status, "started");
    assertExists(startData.session_id);
    
    const sessionId = startData.session_id;
    console.log("Started session:", sessionId);
    
    // 2. Update session
    const updateResponse = await fetch(`${SUPABASE_URL}/functions/v1/telemetry-ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "update",
        session_id: sessionId,
        game_title: "ATS",
        data: {
          play_time_minutes: 15,
          speed: 62,
          rpm: 1450,
          raw: { position: { x: 100, y: 200 } },
        },
      }),
    });
    
    assertEquals(updateResponse.status, 200);
    const updateData = await updateResponse.json();
    assertEquals(updateData.status, "updated");
    assertEquals(updateData.session_id, sessionId);
    console.log("Updated session");
    
    // 3. Complete session
    const completeResponse = await fetch(`${SUPABASE_URL}/functions/v1/telemetry-ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "complete",
        session_id: sessionId,
        game_title: "ATS",
        data: {
          play_time_minutes: 30,
          score: 95,
          distance_traveled: 150,
          damage: 2,
          raw: { completed: true },
        },
      }),
    });
    
    assertEquals(completeResponse.status, 200);
    const completeData = await completeResponse.json();
    assertEquals(completeData.status, "completed");
    assertEquals(completeData.session_id, sessionId);
    console.log("Completed session, work_order_completed:", completeData.work_order_completed);
  },
});

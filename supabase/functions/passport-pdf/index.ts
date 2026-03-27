import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SkillCredential {
  id: string;
  title: string;
  credential_type: string;
  issued_at: string;
  expires_at: string | null;
  score: number | null;
  issuer: string | null;
  skills_verified: string[] | null;
  verification_hash: string;
}

interface ProfileData {
  id: string;
  username: string | null;
  avatar_url: string | null;
  employability_score: number | null;
  skills: Record<string, number> | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch passport + credentials
    const { data: passport } = await supabase
      .from("skill_passport")
      .select("id, passport_hash, public_url_slug")
      .eq("user_id", user.id)
      .single();

    let credentials: SkillCredential[] = [];
    if (passport) {
      const { data } = await supabase
        .from("skill_credentials")
        .select("*")
        .eq("passport_id", passport.id)
        .order("issued_at", { ascending: false });
      credentials = (data || []) as SkillCredential[];
    }

    // Fetch game stats
    const { data: gameStats } = await supabase
      .from("user_game_stats")
      .select("game_title, total_play_time_minutes, total_sessions, best_score")
      .eq("user_id", user.id);

    // Fetch XP
    const { data: xpData } = await supabase.rpc("get_user_total_xp", {
      p_user_id: user.id,
    });

    const totalMinutes =
      gameStats?.reduce(
        (sum: number, s: { total_play_time_minutes: number }) =>
          sum + s.total_play_time_minutes,
        0
      ) || 0;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalXp = xpData || 0;
    const skills = (profile.skills as Record<string, number>) || {};
    const score = profile.employability_score || 50;

    // Fetch tenant name
    let tenantName = "FGN Academy";
    if (profile.tenant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", profile.tenant_id)
        .single();
      if (tenant) tenantName = tenant.name;
    }

    const verificationHash = passport?.passport_hash || "N/A";
    const publicSlug = passport?.public_url_slug;

    // Generate SVG-based PDF content
    const html = generatePassportHTML({
      username: profile.username || "Student",
      score,
      totalHours,
      totalXp,
      credentials,
      skills,
      gameStats: gameStats || [],
      tenantName,
      verificationHash,
      publicSlug,
      createdAt: profile.created_at,
      email: user.email || "",
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="skill-passport-${(profile.username || "student").toLowerCase().replace(/\s+/g, "-")}.html"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate passport" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generatePassportHTML(data: {
  username: string;
  score: number;
  totalHours: number;
  totalXp: number;
  credentials: SkillCredential[];
  skills: Record<string, number>;
  gameStats: Array<{
    game_title: string;
    total_play_time_minutes: number;
    total_sessions: number;
    best_score: number | null;
  }>;
  tenantName: string;
  verificationHash: string;
  publicSlug: string | null;
  createdAt: string;
  email: string;
}): string {
  const {
    username,
    score,
    totalHours,
    totalXp,
    credentials,
    skills,
    gameStats,
    tenantName,
    verificationHash,
    publicSlug,
    createdAt,
    email,
  } = data;

  const memberSince = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const skillEntries = Object.entries(skills);
  const credentialRows = credentials
    .slice(0, 15)
    .map(
      (c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:500;">${escapeHtml(c.title)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-transform:capitalize;">${escapeHtml(c.credential_type.replace(/_/g, " "))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${new Date(c.issued_at).toLocaleDateString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${c.score !== null ? c.score + "%" : "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:10px;color:#64748b;">${c.verification_hash.substring(0, 12)}…</td>
    </tr>`
    )
    .join("");

  const gameStatRows = gameStats
    .map(
      (g) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-transform:capitalize;">${escapeHtml(g.game_title.replace(/_/g, " "))}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${Math.round(g.total_play_time_minutes / 60 * 10) / 10}h</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${g.total_sessions}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${g.best_score !== null ? g.best_score : "—"}</td>
    </tr>`
    )
    .join("");

  const skillBars = skillEntries
    .map(
      ([key, val]) => `
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span style="font-size:12px;text-transform:capitalize;">${escapeHtml(key.replace(/_/g, " "))}</span>
        <span style="font-size:12px;font-weight:600;">${val}/100</span>
      </div>
      <div style="background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#f59e0b,#ef4444);height:100%;width:${val}%;border-radius:4px;"></div>
      </div>
    </div>`
    )
    .join("");

  const scoreColor =
    score >= 80 ? "#16a34a" : score >= 60 ? "#f59e0b" : "#ef4444";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Skill Passport — ${escapeHtml(username)}</title>
<style>
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #fff;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  .container { max-width: 800px; margin: 0 auto; padding: 40px 32px; }
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    padding: 40px 32px;
    border-radius: 12px;
    margin-bottom: 32px;
  }
  .header h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.5px; }
  .header .subtitle { opacity: 0.8; font-size: 14px; margin: 0; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin: 24px 0 0;
  }
  .stat-box {
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }
  .stat-value { font-size: 24px; font-weight: 700; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
  .section { margin-bottom: 32px; }
  .section-title {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th {
    text-align: left;
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 2px solid #cbd5e1;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
  }
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #e2e8f0;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
  }
  .verification-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    font-family: monospace;
    font-size: 11px;
    word-break: break-all;
    color: #475569;
  }
  .print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1e293b;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    z-index: 100;
  }
  .print-btn:hover { background: #334155; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="container">
  <!-- Header -->
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <p class="subtitle">FGN Academy — ${escapeHtml(tenantName)}</p>
        <h1>${escapeHtml(username)}</h1>
        <p class="subtitle">Skill Passport · Member since ${memberSince}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;">Employability Score</div>
        <div style="font-size:48px;font-weight:800;color:${scoreColor};line-height:1;">${score.toFixed(1)}</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${totalHours}</div>
        <div class="stat-label">Total Hours</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${totalXp.toLocaleString()}</div>
        <div class="stat-label">Total XP</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${credentials.length}</div>
        <div class="stat-label">Credentials</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${gameStats.length}</div>
        <div class="stat-label">Simulations</div>
      </div>
    </div>
  </div>

  ${
    credentials.length > 0
      ? `
  <!-- Credentials -->
  <div class="section">
    <div class="section-title">Verified Credentials</div>
    <table>
      <thead>
        <tr>
          <th>Credential</th>
          <th>Type</th>
          <th>Issued</th>
          <th>Score</th>
          <th>Hash</th>
        </tr>
      </thead>
      <tbody>${credentialRows}</tbody>
    </table>
  </div>`
      : ""
  }

  ${
    gameStats.length > 0
      ? `
  <!-- Simulation Performance -->
  <div class="section">
    <div class="section-title">Simulation Performance</div>
    <table>
      <thead>
        <tr>
          <th>Simulation</th>
          <th>Hours</th>
          <th>Sessions</th>
          <th>Best Score</th>
        </tr>
      </thead>
      <tbody>${gameStatRows}</tbody>
    </table>
  </div>`
      : ""
  }

  ${
    skillEntries.length > 0
      ? `
  <!-- Skills -->
  <div class="section">
    <div class="section-title">Competency Profile</div>
    <div style="max-width:500px;">${skillBars}</div>
  </div>`
      : ""
  }

  <!-- Verification -->
  <div class="section">
    <div class="section-title">Verification</div>
    <div class="verification-box">
      <strong>Passport Hash:</strong> ${escapeHtml(verificationHash)}<br>
      <strong>Generated:</strong> ${new Date().toISOString()}<br>
      <strong>Holder:</strong> ${escapeHtml(email)}
      ${publicSlug ? `<br><strong>Public URL:</strong> ${escapeHtml(`https://stratify-workforce.lovable.app/passport/${publicSlug}`)}` : ""}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This Skill Passport is issued by FGN Academy. Credentials can be independently verified using the hash above.</p>
    <p>FGN Academy · apprenticeship.gov · TIRAP · ${new Date().getFullYear()}</p>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

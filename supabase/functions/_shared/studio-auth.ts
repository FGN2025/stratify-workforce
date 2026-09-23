// Shared auth + scope helpers for the FGN Studio read-only catalog API.
// Read-only. No write path. Contract: X-Studio-Contract.

export const CONTRACT_VERSION = '2026-09-23.1';
export const SUPPORTED_CONTRACT_VERSIONS = ['2026-09-23.1'];

export const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_MAX_REQUESTS = 120;

export const BASE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers':
    'authorization, x-app-key, x-studio-contract, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '600',
  Vary: 'Origin',
};

/**
 * Discovery routes (/capabilities, /openapi.json, /openapi.yaml) are readable from any
 * origin without a credential — they carry no tenant data. Every other route is
 * restricted to origins registered against the operator key, and returns no
 * allow-origin header for an unapproved browser origin.
 */
export const DISCOVERY_ROUTES = new Set(['capabilities', 'openapi.json', 'openapi.yaml', '']);

export function corsFor(
  origin: string | null,
  isDiscovery: boolean,
  approvedOrigins: string[] | null,
): Record<string, string> {
  const headers = { ...BASE_CORS_HEADERS };
  if (isDiscovery) {
    headers['Access-Control-Allow-Origin'] = origin ?? '*';
    return headers;
  }
  // Server-to-server calls send no Origin header; they are unaffected by CORS.
  if (!origin) return headers;
  if (approvedOrigins && approvedOrigins.some((o) => o === origin || o === '*')) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    'fgnstudio_' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function bearerFrom(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export type StudioSession = {
  tokenId: string;
  tokenHash: string;
  appId: string;
  tenantId: string;
  includeDescendants: boolean;
  scopes: string[];
  expiresAt: string;
  approvedOrigins: string[];
};

export type AuthFailure = { status: number; code: string; message: string };

export function isAuthFailure(v: unknown): v is AuthFailure {
  return !!v && typeof v === 'object' && 'code' in (v as Record<string, unknown>);
}

/** Resolves a short-lived Studio token. Never accepts a durable app key. */
export async function resolveSession(
  // deno-lint-ignore no-explicit-any
  admin: any,
  req: Request,
): Promise<StudioSession | AuthFailure> {
  const raw = bearerFrom(req);
  if (!raw) {
    return { status: 401, code: 'credential_absent', message: 'Authorization: Bearer <studio token> required.' };
  }
  if (!raw.startsWith('fgnstudio_')) {
    return {
      status: 401,
      code: 'credential_invalid',
      message: 'Durable app keys are not accepted on catalog routes. Exchange the operator key for a short-lived Studio token.',
    };
  }
  const tokenHash = await sha256Hex(raw);
  const { data: token } = await admin
    .from('studio_tokens')
    .select('id, app_id, tenant_id, include_descendants, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!token) {
    return { status: 401, code: 'credential_invalid', message: 'Token not recognised.' };
  }
  if (token.revoked_at) {
    return { status: 401, code: 'credential_revoked', message: 'Token has been revoked.' };
  }
  if (new Date(token.expires_at).getTime() <= Date.now()) {
    return { status: 401, code: 'credential_expired', message: 'Token has expired.' };
  }
  if (!Array.isArray(token.scopes) || !token.scopes.includes('catalog:read')) {
    return { status: 403, code: 'scope_denied', message: 'Token lacks the catalog:read scope.' };
  }

  const { data: app } = await admin
    .from('authorized_apps')
    .select('id, is_active, can_read_catalog, allowed_origins')
    .eq('id', token.app_id)
    .maybeSingle();

  if (!app || !app.is_active) {
    return { status: 401, code: 'credential_revoked', message: 'Issuing application is inactive.' };
  }
  if (!app.can_read_catalog) {
    return { status: 403, code: 'scope_denied', message: 'Issuing application has no catalog read scope.' };
  }

  return {
    tokenId: token.id,
    tokenHash,
    appId: token.app_id,
    tenantId: token.tenant_id,
    includeDescendants: !!token.include_descendants,
    scopes: token.scopes,
    expiresAt: token.expires_at,
    approvedOrigins: app.allowed_origins ?? [],
  };
}

/** Fixed-window rate limit, keyed on the token hash. */
export async function checkRateLimit(
  // deno-lint-ignore no-explicit-any
  admin: any,
  tokenHash: string,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now();
  const windowStart = new Date(
    Math.floor(now / (RATE_LIMIT_WINDOW_SECONDS * 1000)) * RATE_LIMIT_WINDOW_SECONDS * 1000,
  ).toISOString();

  const { data: count, error } = await admin.rpc('studio_rate_limit_hit', {
    p_hash: tokenHash,
    p_window: windowStart,
  });
  if (error) throw error;

  const retryAfter = Math.ceil(
    (new Date(windowStart).getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000 - now) / 1000,
  );
  return { allowed: Number(count ?? 0) <= RATE_LIMIT_MAX_REQUESTS, retryAfter: Math.max(retryAfter, 1) };
}

/** Tenant scope: the token's tenant, plus descendants only when explicitly granted. */
export async function resolveTenantScope(
  // deno-lint-ignore no-explicit-any
  admin: any,
  session: StudioSession,
): Promise<string[]> {
  if (!session.includeDescendants) return [session.tenantId];
  const { data } = await admin.rpc('get_child_tenants', { p_tenant_id: session.tenantId });
  const ids = new Set<string>([session.tenantId]);
  // deno-lint-ignore no-explicit-any
  (data ?? []).forEach((row: any) => {
    const id = typeof row === 'string' ? row : row?.get_child_tenants ?? row?.id;
    if (id) ids.add(id);
  });
  return Array.from(ids);
}

// ---------- scope-bound cursors ----------

export type CursorPayload = {
  s: string; // scope fingerprint
  v: number; // catalog version the walk started on
  o: number; // offset
  q: string; // query fingerprint
};

export function encodeCursor(p: CursorPayload): string {
  return btoa(JSON.stringify(p)).replace(/=+$/, '');
}

export function decodeCursor(raw: string): CursorPayload | null {
  try {
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    if (
      typeof parsed?.s !== 'string' ||
      typeof parsed?.v !== 'number' ||
      typeof parsed?.o !== 'number' ||
      typeof parsed?.q !== 'string'
    ) {
      return null;
    }
    return parsed as CursorPayload;
  } catch {
    return null;
  }
}

export async function scopeFingerprint(session: StudioSession): Promise<string> {
  return (await sha256Hex(`${session.tenantId}:${session.includeDescendants}:${session.appId}`)).slice(0, 16);
}

export function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...cors,
      ...extra,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Studio-Contract': CONTRACT_VERSION,
    },
  });
}

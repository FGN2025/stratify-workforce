// Exact allowlist of post-sign-in destinations (review clarification 5).
// Only same-origin paths whose first segment is approved are accepted; no
// prefix matching on full URLs, no query strings or fragments carrying state.
// Single exception: the app-sign-in approval page, which must keep its
// authorization_id so the person returns to the same pending request.
const ALLOWED_ROOTS = new Set([
  'workspace', 'learn', 'work-orders', 'profile', 'programs', 'settings',
  'events', 'communities', 'careers', 'sim', 'apps', 'disciplines',
]);
const SEGMENT = /^[A-Za-z0-9_-]+$/;
const CONSENT = /^\/\.lovable\/oauth\/consent\?authorization_id=[A-Za-z0-9_-]{1,128}$/;

export const DEFAULT_DESTINATION = '/workspace';

export function safeDestination(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_DESTINATION;
  if (CONSENT.test(raw)) return raw;
  const path = raw.split(/[?#]/)[0];
  if (!path.startsWith('/') || path.startsWith('//')) return DEFAULT_DESTINATION;
  const segments = path.slice(1).split('/').filter(Boolean);
  if (segments.length === 0 || !ALLOWED_ROOTS.has(segments[0])) return DEFAULT_DESTINATION;
  if (!segments.every((s) => SEGMENT.test(s))) return DEFAULT_DESTINATION;
  return `/${segments.join('/')}`;
}

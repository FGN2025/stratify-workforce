// Exact allowlist of post-sign-in destinations (review clarification 5).
// Only same-origin paths whose first segment is approved are accepted; no
// prefix matching on full URLs, no query strings or fragments carrying state.
const ALLOWED_ROOTS = new Set([
  'workspace', 'learn', 'work-orders', 'profile', 'programs', 'settings',
  'events', 'communities', 'careers', 'sim',
]);
const SEGMENT = /^[A-Za-z0-9_-]+$/;

export const DEFAULT_DESTINATION = '/workspace';

export function safeDestination(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_DESTINATION;
  const path = raw.split(/[?#]/)[0];
  if (!path.startsWith('/') || path.startsWith('//')) return DEFAULT_DESTINATION;
  const segments = path.slice(1).split('/').filter(Boolean);
  if (segments.length === 0 || !ALLOWED_ROOTS.has(segments[0])) return DEFAULT_DESTINATION;
  if (!segments.every((s) => SEGMENT.test(s))) return DEFAULT_DESTINATION;
  return `/${segments.join('/')}`;
}

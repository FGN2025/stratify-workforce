import { describe, it, expect } from 'vitest';
import { safeDestination } from './safe-redirect';

describe('app sign-in return', () => {
  it('keeps the approval page with its request id', () => {
    expect(safeDestination('/.lovable/oauth/consent?authorization_id=abc-123')).toBe('/.lovable/oauth/consent?authorization_id=abc-123');
  });
  it('rejects extra parameters on the approval page', () => {
    expect(safeDestination('/.lovable/oauth/consent?authorization_id=a&next=https://evil.com')).toBe('/workspace');
  });
  it('still rejects other sites', () => {
    expect(safeDestination('//evil.com/.lovable/oauth/consent?authorization_id=a')).toBe('/workspace');
  });
});

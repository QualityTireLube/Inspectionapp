import { isExpired, scheduleAutoLogout, parseJwt } from '../auth';

function createToken(expSecondsFromNow: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = { exp: nowSec + expSecondsFromNow } as any;
  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode(header)}.${encode(payload)}.signature`;
}

describe('auth utils', () => {
  test('isExpired returns true for null/invalid token', () => {
    expect(isExpired(null)).toBe(true);
    expect(isExpired('')).toBe(true);
    expect(isExpired('invalid.token')).toBe(true);
  });

  test('isExpired respects skew (30s default)', () => {
    const tokenExp60s = createToken(60);
    // With 30s skew, 60s token is valid now
    expect(isExpired(tokenExp60s)).toBe(false);

    const tokenExp20s = createToken(20);
    // With 30s skew, 20s token should be treated as expired
    expect(isExpired(tokenExp20s)).toBe(true);
  });

  test('scheduleAutoLogout triggers logout near expiry', (done) => {
    // Create a token expiring in ~0.2s; with 0 skew, timer runs ~200ms
    const token = createToken(1); // 1 second
    const originalAssign = window.location.assign as any;
    (window.location as any).assign = (url: string) => {
      try {
        expect(url).toContain('/login');
      } finally {
        (window.location as any).assign = originalAssign;
        done();
      }
    };
    // Use 1000ms skew to force immediate logout via timer path
    scheduleAutoLogout(token, 1000);
  });
});



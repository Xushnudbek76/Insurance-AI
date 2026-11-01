import {
  assertCsrf,
  csrfToken,
  setSession,
  verifiedMember,
} from './session-security';
describe('Cookie flags and signed CSRF tokens', () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.SECRET_TOKEN = 'unit-test-signing-key-at-least-32-characters';
    process.env.ALLOWED_ORIGINS = 'https://insurance-ai.tech';
    delete process.env.SESSION_COOKIE_SECURE;
  });
  afterEach(() => {
    for (const key of [
      'NODE_ENV',
      'SECRET_TOKEN',
      'ALLOWED_ORIGINS',
      'SESSION_COOKIE_SECURE',
    ]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  function request(token = 'session-one'): any {
    return {
      headers: {
        origin: 'https://insurance-ai.tech',
        cookie: `__Host-insu-session=${token}`,
      },
    };
  }
  function response(): any {
    return {
      cookies: [] as any[],
      cookie(name: string, value: string, options: any) {
        this.cookies.push({ name, value, options });
      },
    };
  }
  it('uses a host-only secure HttpOnly session cookie and a separate readable CSRF cookie', () => {
    const req = request(),
      res = response();
    setSession(req, res, 'session-one', { _id: 'owner' } as any);
    const session = res.cookies.find(
      (cookie: any) => cookie.name === '__Host-insu-session',
    );
    expect(session.options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 43200000,
    });
    expect(session.options.domain).toBeUndefined();
    expect(
      res.cookies.find((cookie: any) => cookie.name === '__Host-insu-csrf')
        .options.httpOnly,
    ).toBe(false);
    expect(req[verifiedMember]._id).toBe('owner');
  });
  it('rejects missing, forged or wrong-session CSRF tokens', () => {
    const req = request(),
      res = response();
    const token = csrfToken(req, res);
    expect(() => assertCsrf(req)).toThrow();
    req.headers.cookie += `; __Host-insu-csrf=${token}`;
    req.headers['x-csrf-token'] = token;
    expect(() => assertCsrf(req)).not.toThrow();
    req.headers.cookie = req.headers.cookie.replace(
      'session-one',
      'session-two',
    );
    expect(() => assertCsrf(req)).toThrow();
  });
  it('rejects untrusted origins even with a valid matching CSRF pair', () => {
    const req = request(),
      res = response();
    const token = csrfToken(req, res);
    req.headers.cookie += `; __Host-insu-csrf=${token}`;
    req.headers['x-csrf-token'] = token;
    req.headers.origin = 'https://unlisted.example';
    expect(() => assertCsrf(req)).toThrow();
  });
});

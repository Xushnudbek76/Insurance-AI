import { corsOrigin } from './cors';

describe('HTTP and Socket.IO origin policy', () => {
  const savedOrigins = process.env.ALLOWED_ORIGINS;
  const savedMode = process.env.NODE_ENV;

  afterEach(() => {
    if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = savedOrigins;
    if (savedMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedMode;
  });

  function allowed(origin: string | undefined): boolean {
    let result: boolean | undefined;
    corsOrigin(origin, (error, value) => {
      if (error) throw error;
      result = value;
    });
    return result === true;
  }

  it('accepts configured origins and rejects similar unlisted domains', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS =
      ' https://insu.example, https://preview.example ';
    expect(allowed('https://insu.example')).toBe(true);
    expect(allowed('https://preview.example')).toBe(true);
    expect(allowed('https://insu.example.attacker.test')).toBe(false);
  });

  it('rejects browser origins in production when the allowlist is empty', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = ' , ';
    expect(allowed('https://unknown.example')).toBe(false);
  });

  it('allows Azure health probes without an Origin header', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOWED_ORIGINS;
    expect(allowed(undefined)).toBe(true);
  });

  it('preserves local development access when no allowlist is configured', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOWED_ORIGINS;
    expect(allowed('http://localhost:3001')).toBe(true);
  });
});

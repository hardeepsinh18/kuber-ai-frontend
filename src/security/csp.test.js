/**
 * ISS-14 / SEC-C-001 — the CSP is a versioned artifact, so it gets versioned tests.
 *
 * These assertions exist to make a silent weakening of the policy fail CI. The
 * 'unsafe-inline' style-src exception is asserted as INTENTIONAL (charts +
 * framer-motion inject styles at runtime); the script-src tightness is asserted
 * as load-bearing, because that is the directive that actually contains XSS.
 */
import { describe, it, expect } from 'vitest';
import { CSP_DIRECTIVES, buildCsp, buildMetaCsp } from './csp.js';

describe('CSP artifact', () => {
  it('denies by default', () => {
    expect(CSP_DIRECTIVES['default-src']).toEqual(["'self'"]);
  });

  it('never allows inline or eval scripts', () => {
    const scriptSrc = CSP_DIRECTIVES['script-src'].join(' ');
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('script-src allows self plus exactly one confirmed third-party origin (Smallcase Gateway SDK)', () => {
    // A deliberate, documented widening (Smallcase holdings import) — not a
    // silent one. If this list grows, it should be because a NEW third-party
    // script was deliberately added in the same commit as its own CSP entry,
    // per this file's own stated contract — never append blindly.
    expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'", 'https://gateway.smallcase.com']);
  });

  it('blocks object/embed and base-tag hijacking', () => {
    expect(CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES['base-uri']).toEqual(["'self'"]);
    expect(CSP_DIRECTIVES['form-action']).toEqual(["'self'"]);
  });

  it('keeps style-src unsafe-inline only (charts + framer-motion inject styles)', () => {
    expect(CSP_DIRECTIVES['style-src']).toContain("'unsafe-inline'");
    expect(CSP_DIRECTIVES['style-src']).toContain("'self'");
  });

  it('self-hosts fonts — no third-party font origin', () => {
    const fontSrc = CSP_DIRECTIVES['font-src'].join(' ');
    expect(fontSrc).toBe("'self'");
    expect(fontSrc).not.toContain('gstatic');
    expect(fontSrc).not.toContain('googleapis');
  });

  it('allows only same-origin API, AWS Cognito, and the Smallcase Gateway SDK for connect-src', () => {
    const connect = CSP_DIRECTIVES['connect-src'];
    expect(connect).toContain("'self'");
    expect(connect.some((v) => v.includes('cognito-idp.ap-south-1.amazonaws.com'))).toBe(true);
    expect(connect).toContain('https://gateway.smallcase.com');
    // gatewayapi.smallcase.com is deliberately ABSENT — that's called server-side
    // by the backend (httpx), the browser never reaches it directly.
    expect(connect.some((v) => v.includes('gatewayapi.smallcase.com'))).toBe(false);
    // No wildcard host smuggled in.
    expect(connect).not.toContain('*');
    expect(connect.some((v) => v === 'https://*')).toBe(false);
  });

  it('frame-src is scoped to self plus the Smallcase Gateway SDK only', () => {
    expect(CSP_DIRECTIVES['frame-src']).toEqual(["'self'", 'https://gateway.smallcase.com']);
  });

  it('serializes to a valid single-line policy', () => {
    const csp = buildCsp();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain(';;');
    expect(csp.split('\n')).toHaveLength(1);
  });

  it('drops frame-ancestors from the meta form (browsers ignore it there)', () => {
    expect(buildCsp()).toContain('frame-ancestors');
    expect(buildMetaCsp()).not.toContain('frame-ancestors');
  });
});

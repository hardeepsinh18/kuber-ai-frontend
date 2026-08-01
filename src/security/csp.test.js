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
    expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'"]);
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

  it('allows only same-origin API plus AWS Cognito for connect-src', () => {
    const connect = CSP_DIRECTIVES['connect-src'];
    expect(connect).toContain("'self'");
    expect(connect.some((v) => v.includes('cognito-idp.ap-south-1.amazonaws.com'))).toBe(true);
    // No wildcard host smuggled in.
    expect(connect).not.toContain('*');
    expect(connect.some((v) => v === 'https://*')).toBe(false);
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

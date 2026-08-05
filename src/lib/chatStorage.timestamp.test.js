/**
 * toTimestamp decides sidebar ordering, so a wrong answer here silently
 * reshuffles the user's chat list.
 *
 * Two defects this pins:
 *
 * 1. A missing/unparseable updated_at fell back to Date.now(). That is not a
 *    neutral default — it stamps the chat as "just now", so every background
 *    list refresh floated those chats to the top and relabelled them "now".
 *    The reported symptom was a sidebar where eight chats all read "now" and
 *    re-sorted on their own. A chat with no known timestamp must sort as OLD
 *    (0), never as newest.
 *
 * 2. Postgres/FastAPI commonly serialise timestamps without a timezone
 *    ("2026-08-04T09:12:00" or "2026-08-04 09:12:00"). `new Date(...)` parses
 *    the space form, and per spec the date-time form without an offset, as
 *    LOCAL time. The backend stores UTC, so in IST every such timestamp landed
 *    5h30m off — enough to order chats wrongly and to render "20h ago" for
 *    something recent.
 */
import { describe, it, expect } from 'vitest';
import { toTimestamp } from './chatStorage';

describe('toTimestamp — sidebar ordering input', () => {
    it('treats a missing timestamp as oldest, not as "now"', () => {
        // Date.now() here is what made chats jump to the top of the sidebar.
        expect(toTimestamp(null)).toBe(0);
        expect(toTimestamp(undefined)).toBe(0);
        expect(toTimestamp('')).toBe(0);
    });

    it('treats an unparseable timestamp as oldest, not as "now"', () => {
        expect(toTimestamp('not-a-date')).toBe(0);
        expect(toTimestamp({})).toBe(0);
    });

    it('passes through an epoch number unchanged', () => {
        expect(toTimestamp(1754300000000)).toBe(1754300000000);
    });

    it('parses an explicit-UTC ISO string', () => {
        expect(toTimestamp('2026-08-04T09:12:00Z')).toBe(Date.UTC(2026, 7, 4, 9, 12, 0));
    });

    it('parses a timezone-less ISO string as UTC, not local', () => {
        // The backend stores UTC. Without this, IST shifted it by -5h30m.
        expect(toTimestamp('2026-08-04T09:12:00')).toBe(Date.UTC(2026, 7, 4, 9, 12, 0));
    });

    it('parses the Postgres space-separated form as UTC', () => {
        expect(toTimestamp('2026-08-04 09:12:00')).toBe(Date.UTC(2026, 7, 4, 9, 12, 0));
    });

    it('parses fractional seconds as UTC', () => {
        expect(toTimestamp('2026-08-04 09:12:00.123456')).toBe(
            Date.UTC(2026, 7, 4, 9, 12, 0, 123)
        );
    });

    it('respects an explicit non-UTC offset rather than forcing UTC', () => {
        // +05:30 means 09:12 IST == 03:42 UTC. Only tz-LESS strings get the
        // UTC assumption; an explicit offset is authoritative.
        expect(toTimestamp('2026-08-04T09:12:00+05:30')).toBe(Date.UTC(2026, 7, 4, 3, 42, 0));
    });

    it('orders a known timestamp below a missing one', () => {
        // The ordering property the sidebar actually depends on.
        expect(toTimestamp('2026-08-04T09:12:00Z')).toBeGreaterThan(toTimestamp(null));
    });
});

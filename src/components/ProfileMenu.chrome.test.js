/**
 * The account menu looked like a foreign panel dropped on the sidebar.
 *
 * Two causes. It was 256px against the sidebar's 220px, so it overhung the
 * column it belongs to. And it used an amber border plus an amber glow, which no
 * other sidebar surface does — brand yellow is for ACTIONS here (New chat, the
 * avatar), not container chrome.
 *
 * Separately, the trigger row gave no sign it was clickable: a name and avatar
 * with only a hover tint, which is invisible until the pointer is already on it
 * and absent entirely on touch.
 *
 * Asserted against source: the component portals into document.body and needs
 * auth/router/theme providers, and what is under test is the styling contract
 * with Sidebar.jsx rather than runtime behaviour.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const menu = fs.readFileSync(path.resolve(here, './ProfileMenu.jsx'), 'utf8');
const sidebar = fs.readFileSync(path.resolve(here, './Sidebar.jsx'), 'utf8');

describe('account menu matches the sidebar it belongs to', () => {
    it('is exactly as wide as the expanded sidebar', () => {
        const menuWidth = Number(menu.match(/const MENU_WIDTH = (\d+)/)?.[1]);
        const sidebarWidth = Number(sidebar.match(/md:w-\[(\d+)px\]/)?.[1]);
        expect(sidebarWidth).toBe(220);
        expect(menuWidth).toBe(sidebarWidth);
    });

    it('uses the sidebar container surface, not its own', () => {
        expect(menu).toContain('bg-[#E8E5DC] dark:bg-[#1a1a1a]');
        expect(sidebar).toContain("'bg-[#E8E5DC] border-zinc-300/80'");
        expect(sidebar).toContain("'dark:bg-[#1a1a1a] dark:border-zinc-700/50'");
    });

    it('does not use brand amber for the menu panel chrome', () => {
        // Amber stays on actions (avatar, Free Plan, the theme knob) — an amber
        // BORDER or glow on the panel is what made it read as foreign.
        //
        // Scoped to the dropdown panel only: the privacy-notice modal further
        // down is a centre-screen role="dialog", not sidebar chrome, and keeps
        // its amber edge deliberately.
        const panelStart = menu.indexOf('const MENU_WIDTH');
        const panelEnd = menu.indexOf('showPrivacyNotice &&');
        const panel = menu.slice(panelStart, panelEnd);
        expect(panelEnd).toBeGreaterThan(panelStart);
        expect(panel).not.toContain('dark:border-[#FDD405]/40');
        expect(panel).not.toContain('rgba(253,212,5');
    });

    it('keeps the longest row on one line at the narrower width', () => {
        // "Privacy Policy & Terms of Use" is ~181px of text; at 220px it wrapped.
        expect(menu).toContain('whitespace-nowrap');
    });
});

describe('the trigger looks clickable', () => {
    it('shows a chevron as a persistent affordance', () => {
        expect(menu).toContain('ChevronUp');
    });

    it('the chevron points at the menu and flips when it opens', () => {
        expect(menu).toMatch(/open \? 'rotate-0' : 'rotate-180'/);
    });

    it('the chevron is decorative for screen readers', () => {
        // aria-haspopup/aria-expanded on the button already convey the state.
        expect(menu).toContain('aria-hidden="true"');
        expect(menu).toContain('aria-haspopup="menu"');
        expect(menu).toContain('aria-expanded={open}');
    });

    it('holds a visible pressed state while the menu is open', () => {
        expect(menu).toMatch(/open \? 'bg-zinc-200\/70 dark:bg-white\/\[0\.07\]' : ''/);
    });
});

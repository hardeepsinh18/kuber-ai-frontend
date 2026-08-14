// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LegalPage from './LegalPage';
import { ThemeProvider } from '../context/ThemeContext';

afterEach(cleanup);

/**
 * #root is a fixed-height (100dvh) column flex container built for the chat shell.
 * These legal pages are long documents that scroll the window, and as flex items
 * they were capped at the container's height — the themed background box stopped at
 * exactly one viewport while the text kept flowing past it, onto the transparent
 * body's white canvas. In dark theme that left near-white text on white: the Terms
 * and Privacy pages were unreadable below the fold on mobile.
 *
 * NOTE ON WHAT THIS COVERS: jsdom has no layout engine, so it cannot reproduce the
 * overflow itself — getBoundingClientRect is all zeroes here. This asserts only that
 * the growth declaration survives on the container, which is what stops a future
 * edit from silently dropping it. The behavioural verification was done in a real
 * browser: pre-fix the painted box measured 915px against 1026px of content on a
 * 412x915 viewport; post-fix it measured 1026px, with the lowest text at y=1968
 * inside a 2000px box on the longer Privacy page, in both themes and at 1440x900.
 */
const renderLegal = (doc) =>
    render(
        <MemoryRouter>
            <ThemeProvider><LegalPage doc={doc} /></ThemeProvider>
        </MemoryRouter>,
    );

describe.each(['terms', 'privacy'])('LegalPage(%s) background box', (doc) => {
    it('can grow past the fixed-height flex shell', () => {
        const { container } = renderLegal(doc);
        const page = container.firstElementChild;

        // flex-shrink must be 0 — a shrinkable item gets capped at #root's height.
        expect(page.style.flexShrink).toBe('0');
        expect(page.style.flexBasis).toBe('auto');
    });

    it('still fills the viewport when the document is short', () => {
        const { container } = renderLegal(doc);
        expect(container.firstElementChild.style.minHeight).toBe('100vh');
    });

    it('paints an explicit themed background', () => {
        const { container } = renderLegal(doc);
        const page = container.firstElementChild;
        // Must not be transparent — the body canvas behind it is white in both themes.
        expect(page.style.backgroundColor).toBeTruthy();
        expect(page.style.color).toBeTruthy();
    });
});

import React from 'react';
import { annotateProse } from '../../utils/glossaryProse';
import { GlossaryTerm } from './FundamentalCard/InfoTip';

/**
 * Renders prose with its first-mention jargon underlined and tappable.
 *
 * The visual treatment is deliberately quiet: a dotted brand-yellow underline,
 * no icon, no colour change to the word itself. A reader who already knows what
 * "MACD" means reads straight past it; one who doesn't gets a definition on tap.
 * Nothing is added to the page's resting state.
 *
 * IMPORTANT — why annotation is precomputed rather than done during render:
 * de-duplicating "first mention" needs state shared across sibling blocks, and
 * a Set mutated *during* render is not safe. React StrictMode double-invokes
 * render, so a Set filled on the first pass makes the second pass believe every
 * term was already used and emit no marks at all — and it is the second pass
 * that reaches the DOM. That is exactly why in-prose marking silently did
 * nothing in the browser while passing in tests. Callers therefore build
 * segments inside a `useMemo` (a pure function of the text) and hand them to
 * <GlossarySegments>.
 */

/** Renders precomputed segments from `annotateProse`. */
export const GlossarySegments = ({ segments }) => {
    if (!Array.isArray(segments)) return null;
    return (
        <>
            {segments.map((s, i) =>
                s.term
                    ? <GlossaryTerm key={i} term={s.term}>{s.text}</GlossaryTerm>
                    : <React.Fragment key={i}>{s.text}</React.Fragment>
            )}
        </>
    );
};

/**
 * Standalone block of text that owns its own de-duplication scope, so the memo
 * depends only on its own content and render stays idempotent.
 *
 * Children arriving from react-markdown may mix strings with elements; only the
 * string parts are annotated, so a term inside a link is never rewrapped.
 */
export const GlossaryText = ({ children }) => {
    const parts = React.useMemo(() => {
        const seen = new Set();
        return React.Children.toArray(children).map(child =>
            typeof child === 'string' ? annotateProse(child, seen) : child
        );
    }, [children]);

    return (
        <>
            {parts.map((part, i) =>
                Array.isArray(part)
                    ? <GlossarySegments key={i} segments={part} />
                    : <React.Fragment key={i}>{part}</React.Fragment>
            )}
        </>
    );
};

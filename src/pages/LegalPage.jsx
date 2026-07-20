import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import KuberLogo from '../components/KuberLogo';

/**
 * Terms of Service / Privacy Policy pages (QA-C-002).
 *
 * The login page asserts "By continuing you agree to our Terms of Service and
 * Privacy Policy" but those links previously pointed nowhere. These are honest,
 * plain-language summaries grounded in what the app actually does; they are
 * informational and not a substitute for advice from the operator's counsel.
 */

const LAST_UPDATED = 'July 2026';

const TERMS = [
    ['What KuberAI is',
        'KuberAI ("the Service"), by 72 Street, is an informational and educational tool for the ' +
        'Indian stock market (NSE/BSE). It provides market data, analysis, screening and general ' +
        'financial concepts.'],
    ['Not investment advice',
        'Nothing in the Service is investment, legal, or tax advice, and 72 Street is not a ' +
        'SEBI-registered investment adviser. Content is for information only. Markets carry risk and ' +
        'past performance does not guarantee future results. Always do your own research and consult a ' +
        'SEBI-registered adviser before investing. You are solely responsible for your decisions.'],
    ['Accuracy & availability',
        'Market data and AI-generated responses may be delayed, incomplete, or wrong. The Service is ' +
        'provided "as is" without warranties, and may be unavailable or change at any time.'],
    ['Acceptable use',
        'Do not abuse, overload, scrape, reverse-engineer, or attempt to break the Service, and do not ' +
        'use it for unlawful purposes. Access may be rate-limited or suspended to protect the Service.'],
    ['Contact',
        'Questions about these terms: reach 72 Street through the channels listed on our website.'],
];

const PRIVACY = [
    ['Overview',
        'This summary explains, in plain language, what information the Service handles and why. It ' +
        'covers the app at aws.72street.ai.'],
    ['What we handle',
        'If you sign in, your email address (via AWS Cognito) so we can recognise your account. Your ' +
        'chat queries, which are processed to generate a response. Basic technical request data (such ' +
        'as a network address and timing) used to keep the Service reliable and to prevent abuse and ' +
        'run-away usage.'],
    ['Why',
        'To operate the Service, generate answers, keep it secure and available (rate-limiting / ' +
        'abuse-prevention), and improve quality. We do not sell your personal information.'],
    ['Third parties',
        'To answer your questions we use service providers — market-data sources and AI/LLM providers — ' +
        'which process the query needed to produce a response. Authentication uses AWS Cognito.'],
    ['Your choices',
        'You can use much of the Service without signing in. For questions about your data, or to ask ' +
        'about access or deletion, contact 72 Street through our website.'],
    ['Contact',
        'Privacy questions: reach 72 Street through the channels listed on our website.'],
];


export default function LegalPage({ doc = 'terms' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isPrivacy = doc === 'privacy';
    const sections = isPrivacy ? PRIVACY : TERMS;
    const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';

    const bg = isDark ? '#0A0A0A' : '#F5F2E8';
    const text = isDark ? '#e5e5e5' : '#1a1a1a';
    const sub = isDark ? 'rgba(161,161,170,1)' : 'rgba(82,82,91,1)';
    const heading = isDark ? '#fff' : '#111';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: bg, color: text, padding: '32px 20px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <KuberLogo size={28} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: heading, letterSpacing: 1 }}>KUBER AI</span>
                </div>

                <h1 style={{ fontSize: 26, fontWeight: 800, color: heading, marginBottom: 4 }}>{title}</h1>
                <p style={{ fontSize: 12, color: sub, marginBottom: 24 }}>Last updated: {LAST_UPDATED}</p>

                {sections.map(([h, body]) => (
                    <section key={h} style={{ marginBottom: 20 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: heading, marginBottom: 6 }}>{h}</h2>
                        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: text }}>{body}</p>
                    </section>
                ))}

                <p style={{ fontSize: 11.5, color: sub, marginTop: 8, paddingTop: 16, borderTop: `1px solid ${border}` }}>
                    This is a plain-language summary for transparency and is not legal advice. For the
                    authoritative position, contact 72 Street.
                </p>

                <div style={{ marginTop: 28, display: 'flex', gap: 16 }}>
                    <Link to="/login" style={{ fontSize: 13, color: sub, textDecoration: 'underline' }}>← Back</Link>
                    <Link to={isPrivacy ? '/terms' : '/privacy'} style={{ fontSize: 13, color: sub, textDecoration: 'underline' }}>
                        {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
                    </Link>
                </div>
            </div>
        </div>
    );
}

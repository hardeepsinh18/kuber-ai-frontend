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
    ['What Venty is',
        'Venty ("the Service"), by 72 Street, is an informational and educational tool for the ' +
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
    // CONF-REG-002: the four sections below are required by India's DPDP Rules
    // (notified 2025-11-13) and were missing. The retention figures and endpoint
    // paths are TRUE as implemented (DATA_RETENTION_DAYS=90; GET /api/v1/privacy/export
    // and POST /api/v1/privacy/delete both exist and are authenticated).
    //
    // TWO PLACEHOLDERS MUST BE FILLED BEFORE THIS IS RELIED ON — marked [TO BE
    // CONFIRMED] below. A named Data Protection Officer and a working postal address
    // are statutory requirements; nobody but 72 Street can supply them, and inventing
    // them would be worse than leaving the gap visible. Legal should review the whole
    // section before it is treated as the authoritative notice.
    // CONF-D-010: this section previously said "chat queries ... deleted after 90
    // days", which was NOT true and understated retention. The 90-day purge covers
    // api_usage_log only (query text, IP, timing metadata). Your actual chat
    // history — questions AND our answers, including buy/sell verdicts — lives in
    // chat_messages and is retained while the account exists, because 72 Street
    // operates as a SEBI-registered Research Analyst and those regulations require
    // records of research and recommendations to be retained and justifiable to the
    // regulator after the fact.
    //
    // Stating the shorter figure was the harder position to defend under DPDP: the
    // published promise and the system behaviour disagreed, and the promise was the
    // more generous one. This text now matches what the code does.
    ['How long we keep it',
        'Your chat history — your questions and our responses, including any analysis ' +
        'or verdict we provide — is kept for as long as your account exists. We are ' +
        'required to do this: 72 Street operates as a SEBI-registered Research Analyst, ' +
        'and SEBI regulations require us to retain records of the research and ' +
        'recommendations we give, so they can be reviewed by the regulator. ' +
        'Technical request logs (the query text we log for diagnostics, your IP address ' +
        'and timing data) are automatically deleted after 90 days. ' +
        'Your account record (email, and the display name you provide) is kept while ' +
        'your account exists. You can erase your account at any time from the app, ' +
        'which permanently deletes your chat history and account record. Aggregate, ' +
        'non-identifying usage counts may be retained longer to monitor reliability.'],
    ['Your rights, and how to use them',
        'You can request a copy of your data, correct it, or erase it. Signed in, you can ' +
        'export everything we hold via the privacy endpoints in the app, and erasing your ' +
        'account permanently deletes your chats and account record. You can also withdraw ' +
        'consent at any time — withdrawing consent for the Service as a whole means erasing ' +
        'your account, since we cannot generate answers without processing your query.'],
    ['Grievance redressal',
        'If you have a complaint about how your data is handled, contact our Data Protection ' +
        'Officer: [TO BE CONFIRMED — name] at privacy@72street.ai, [TO BE CONFIRMED — postal ' +
        'address]. We will acknowledge within 3 business days and respond substantively ' +
        'within 30 days. If you are not satisfied with our response, you may escalate the ' +
        'complaint to the Data Protection Board of India, which is the final route under the ' +
        'Digital Personal Data Protection Act, 2023.'],
    ['Your choices',
        'You can use much of the Service without signing in. For questions about your data, or to ask ' +
        'about access or deletion, contact 72 Street through our website.'],
    ['Contact',
        'Privacy questions: privacy@72street.ai, or reach 72 Street through the channels ' +
        'listed on our website.'],
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
                    <KuberLogo size={30} variant={isDark ? 'mark' : 'mark-light'} />
                    <KuberLogo size={17} variant={isDark ? 'wordmark' : 'wordmark-light'} alt="Venty" />
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

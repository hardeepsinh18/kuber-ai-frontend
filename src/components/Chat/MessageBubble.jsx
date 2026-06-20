import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useStreamingText } from '../../hooks/useStreamingText';
import StockChart from './StockChart';
import FundamentalScoreCard, { PatternDetectionSection } from './FundamentalCard';

const normalizeSymbol = (s) => {
    const raw = String(s || "").trim();
    const afterPrefix = raw.includes(":") ? raw.split(":").pop() : raw;
    return afterPrefix
        .replace(/\.NS$/i, "")
        .replace(/\.BO$/i, "")
        .replace(/-EQ$/i, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
};

const normalizeMatchText = (text) => String(text || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const resolveSymbolLabel = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return "";
    const afterPrefix = s.includes(":") ? s.split(":").pop() : s;
    return afterPrefix.replace(/\.NS$/i, "").replace(/\.BO$/i, "").replace(/-EQ$/i, "");
};

// Get plain text from React children (for price/% chip detection)
const getChildText = (children) => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(getChildText).join('');
    if (children?.props?.children != null) return getChildText(children.props.children);
    return '';
};
const isPriceLike = (s) => /^₹[\d,.]+\s*$/.test(String(s).trim());
const isPositivePct = (s) => /^[+][\d.,]+%\s*$/.test(String(s).trim());
const isNegativePct = (s) => /^[-−][\d.,]+%\s*$/.test(String(s).trim());
const isTickerLike = (s) => /^[A-Z0-9]{2,6}$/.test(String(s).trim());

// Strip markdown images, phantom chart sections, and inline "Ask me" (duplicated by follow-up buttons)
const stripResponseChrome = (text) => {
    if (!text || typeof text !== 'string') return text;
    let out = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.replace(/\n?##\s*(Intraday\s+Chart|Chart)\s*\n+/gi, '\n');
    // Remove "💬 Ask me: ..." blocks and all following lines until the next section
    out = out.replace(/\n*💬\s*\*?\*?Ask\s*me:?\*?\*?[\s\S]*?(?=\n##|\n---|\n━|$)/gi, '');
    // Remove "## 💬 Suggested Follow-ups" sections
    out = out.replace(/\n*##\s*💬\s*Suggested Follow-ups[\s\S]*?(?=\n##|\n---|\n━|$)/gi, '');
    // Remove "> **Verdict:** ..." and "> ## 🎯 Verdict:" blockquotes
    out = out.replace(/\n*>\s*(?:##\s*)?[🎯]?\s*\*?\*?Verdict:?\*?\*?[\s\S]*?(?=\n##|\n---|\n━|\n>(?!\s*(?:##\s*)?[🎯]?\s*\*?\*?Verdict)|$)/gi, '');
    // Remove standalone verdict-first lines: lines starting with ✅/⚠️/❌/🔁 + BUY/HOLD/SELL/AVOID/WAIT
    out = out.replace(/^[✅⚠️❌🔁]\s+(Buy|Hold|Sell|Avoid|Wait)\b[^\n]*/gim, '');
    return out.trim();
};

// ─── Signal Card (BUY / SELL / HOLD) ────────────────────────────────────────
const SignalCard = ({ signal }) => {
    if (!signal || !signal.recommendation) return null;

    const rec = signal.recommendation.toUpperCase(); // "BUY", "SELL", "HOLD"
    const confidence = signal.confidence_pct ?? 50;
    const why = Array.isArray(signal.why) ? signal.why.slice(0, 4) : [];
    const risk = (signal.risk || 'medium').toLowerCase();

    const palette = {
        BUY: {
            outer: 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/50',
            badge: 'bg-emerald-500 text-white',
            label: 'text-emerald-700 dark:text-emerald-300',
            bar: 'bg-emerald-500',
            icon: TrendingUp,
        },
        SELL: {
            outer: 'bg-rose-50/80 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/50',
            badge: 'bg-rose-500 text-white',
            label: 'text-rose-700 dark:text-rose-300',
            bar: 'bg-rose-500',
            icon: TrendingDown,
        },
        HOLD: {
            outer: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
            badge: 'bg-[#FDD405] text-white',
            label: 'text-amber-700 dark:text-amber-300',
            bar: 'bg-amber-500',
            icon: Minus,
        },
    };
    const c = palette[rec] || palette.HOLD;
    const Icon = c.icon;

    const riskBadge = {
        low: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/40',
        medium: 'text-amber-600 dark:text-[#FDD405] bg-amber-100/70 dark:bg-amber-950/30',
        high: 'text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/40',
    };

    return (
        <div className={clsx('mb-5 rounded-xl border p-4', c.outer)}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold', c.badge)}>
                        <Icon size={14} />
                        {rec}
                    </span>
                    <span className={clsx('text-sm font-medium', c.label)}>
                        {confidence}% confidence
                    </span>
                </div>
                <span className={clsx('text-xs px-2.5 py-1 rounded-md font-medium capitalize', riskBadge[risk] || riskBadge.medium)}>
                    {risk} risk
                </span>
            </div>

            {/* Confidence bar */}
            <div className="mb-3 h-1.5 bg-zinc-200/80 dark:bg-zinc-700/60 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all duration-700', c.bar)} style={{ width: `${confidence}%` }} />
            </div>

            {/* Entry / Target / Stop-Loss row — hidden */}
            {false && (signal.ideal_entry != null || signal.target != null || signal.stop_loss != null) && (
                <div className="flex flex-wrap gap-5 mb-3">
                    {signal.ideal_entry != null && (
                        <div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">Entry</p>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                ₹{Number(signal.ideal_entry).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    )}
                    {signal.target != null && (
                        <div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">Target</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                ₹{Number(signal.target).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                {signal.upside_pct != null && (
                                    <span className="text-[11px] ml-1 opacity-80">(+{Number(signal.upside_pct).toFixed(1)}%)</span>
                                )}
                            </p>
                        </div>
                    )}
                    {signal.stop_loss != null && (
                        <div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">Stop Loss</p>
                            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                                ₹{Number(signal.stop_loss).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                {signal.downside_pct != null && (
                                    <span className="text-[11px] ml-1 opacity-80">({Number(signal.downside_pct).toFixed(1)}%)</span>
                                )}
                            </p>
                        </div>
                    )}
                    {signal.risk_reward != null && (
                        <div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">Risk : Reward</p>
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                1 : {Number(signal.risk_reward).toFixed(1)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Why bullets */}
            {why.length > 0 && (
                <ul className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/30">
                    {why.map((w, i) => (
                        <li key={i} className={clsx('flex items-start gap-2 text-xs leading-relaxed', c.label)}>
                            <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0 bg-current opacity-60" />
                            <span>{w}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ─── Technical Indicators + Pattern Summary ──────────────────────────────────
const TechnicalSection = ({ technicalSummary, patternSummary }) => {
    if (!technicalSummary && !patternSummary) return null;

    const indicators = [];
    if (technicalSummary) {
        // Note: backend key is "macd_line" (from technical_indicators.py)
        const { rsi, macd_line, macd, bb_pct_b, volatility_30d_pct } = technicalSummary;
        const macdVal = macd_line ?? macd; // support both key names
        if (rsi != null) {
            const color = rsi < 30
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30'
                : rsi > 70
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30'
                    : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/40 border-zinc-200/50 dark:border-zinc-700/30';
            const hint = rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : null;
            indicators.push({ key: 'RSI', value: Number(rsi).toFixed(1), hint, color });
        }
        if (macdVal != null) {
            const color = macdVal > 0
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30'
                : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30';
            indicators.push({ key: 'MACD', value: macdVal > 0 ? `+${Number(macdVal).toFixed(2)}` : Number(macdVal).toFixed(2), color });
        }
        if (bb_pct_b != null) {
            const pct = (Number(bb_pct_b) * 100).toFixed(0);
            const color = bb_pct_b < 0.2
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30'
                : bb_pct_b > 0.8
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30'
                    : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/40 border-zinc-200/50 dark:border-zinc-700/30';
            indicators.push({ key: 'BB%B', value: `${pct}%`, color });
        }
        if (volatility_30d_pct != null) {
            indicators.push({ key: '30d Vol', value: `${Number(volatility_30d_pct).toFixed(1)}%`, color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/40 border-zinc-200/50 dark:border-zinc-700/30' });
        }
    }

    const support = patternSummary?.support;
    const resistance = patternSummary?.resistance;
    const candlestick = Array.isArray(patternSummary?.candlestick) ? patternSummary.candlestick : [];
    const patternText = patternSummary?.summary;

    const hasAnything = indicators.length > 0 || support != null || resistance != null || candlestick.length > 0 || patternText;
    if (!hasAnything) return null;

    return (
        <div className="mt-5 pt-4 border-t border-zinc-200/60 dark:border-zinc-700/40">
            {indicators.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {indicators.map(b => (
                        <span key={b.key} className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border', b.color)}>
                            <span className="opacity-60 font-normal">{b.key}</span>
                            <span>{b.value}</span>
                            {b.hint && <span className="opacity-60">· {b.hint}</span>}
                        </span>
                    ))}
                </div>
            )}

            {(support != null || resistance != null) && (
                <div className="flex flex-wrap gap-4 mb-3 text-sm">
                    {support != null && (
                        <span className="text-zinc-600 dark:text-zinc-400">
                            Support{' '}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                ₹{Number(support).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </span>
                    )}
                    {resistance != null && (
                        <span className="text-zinc-600 dark:text-zinc-400">
                            Resistance{' '}
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                ₹{Number(resistance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </span>
                    )}
                </div>
            )}

            {candlestick.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {candlestick.map((p) => (
                        <span key={p} className="text-xs px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-200/40 dark:border-violet-800/30">
                            {p}
                        </span>
                    ))}
                </div>
            )}

            {patternText && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic leading-relaxed">{patternText}</p>
            )}
        </div>
    );
};

// ─── Collapsible Chart Section ───────────────────────────────────────────────
const ChartSection = ({ chartData, resolveSymbol, patternSummary, atAGlance }) => {
    const [open, setOpen] = React.useState(true);
    if (!chartData) return null;

    const charts = Array.isArray(chartData)
        ? chartData.filter(cd => cd && !cd.error)
        : chartData.error ? [] : [chartData];

    if (charts.length === 0) return null;

    const firstSymbol = charts[0]?.chart_metadata?.symbol
        ? charts[0].chart_metadata.symbol.replace(/\.NS$|\.BO$|-EQ$/i, '')
        : null;
    const title = firstSymbol ? `${firstSymbol} Chart` : 'Stock Chart';

    return (
        <div className="mb-4 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden bg-white dark:bg-[#1C1B15]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
                {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
            </button>
            {open && (
                <div>
                    {charts.map((cd, idx) => (
                        <StockChart
                            key={cd?.chart_metadata?.symbol || idx}
                            chartData={cd}
                            symbol={resolveSymbol(cd, idx)}
                            patternOverlays={patternSummary}
                            atAGlance={atAGlance}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Expandable Indicators Table ─────────────────────────────────────────────
const IndicatorsTable = ({ rows, asOfDate }) => {
    const [open, setOpen] = React.useState(false);
    if (!rows || rows.length === 0) return null;

    const dateLabel = asOfDate
        ? new Date(asOfDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="mt-4 border border-zinc-200 dark:border-zinc-700/50 rounded-xl overflow-hidden bg-white dark:bg-[#1C1B15]">
            {/* Toggle header */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Technical Indicators
                    </span>
                    {dateLabel && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            as of {dateLabel}
                        </span>
                    )}
                </div>
                {open
                    ? <ChevronUp size={14} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                    : <ChevronDown size={14} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                }
            </button>

            {/* Table */}
            {open && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-[#FDD405]">
                                <th className="text-center px-4 py-3 text-sm font-bold text-black w-36">Indicator</th>
                                <th className="text-center px-4 py-3 text-sm font-bold text-black w-36">Value</th>
                                <th className="text-center px-4 py-3 text-sm font-bold text-black">Signal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-[#FDD405] last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap text-center">
                                        {row.indicator}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-zinc-900 dark:text-white whitespace-nowrap">
                                        {row.value || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 whitespace-nowrap text-center">
                                        {row.signal || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Inline choice buttons for "short term or long term?" questions ───────────
// Strip markdown bold/italic markers before testing so **short term** still matches
const hasHorizonQuestion = (text) => {
    if (!text) return false;
    const plain = text.replace(/\*+/g, '').replace(/_+/g, '');
    return /short\s*term.{0,40}or.{0,40}long\s*term|long\s*term.{0,40}or.{0,40}short\s*term/i.test(plain);
};

const HorizonChoice = ({ symbol, onChoice }) => {
    const base = symbol ? `${symbol} ` : '';
    return (
        <div className="flex flex-wrap gap-3 mt-5 mb-2">
            <button
                type="button"
                onClick={() => onChoice(`${base}short term trading — entry, target, stop loss`)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl
                           bg-gradient-to-r from-[#FDD405] to-[#FDD405]
                           text-black font-bold text-[14px]
                           shadow-[0_2px_18px_rgba(253,212,5,0.40)]
                           hover:shadow-[0_4px_28px_rgba(253,212,5,0.60)]
                           hover:from-[#FDD405] hover:to-[#FDD405]/80
                           hover:scale-[1.03] active:scale-[0.97]
                           transition-all duration-150">
                <span>⚡</span>
                Short Term
            </button>
            <button
                type="button"
                onClick={() => onChoice(`${base}long term investment — fundamentals, growth outlook`)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl
                           bg-zinc-800/70 dark:bg-zinc-800/80
                           border border-zinc-600/60 dark:border-zinc-700/60
                           text-zinc-200 dark:text-zinc-200
                           font-bold text-[14px]
                           hover:bg-amber-950/50 dark:hover:bg-amber-950/40
                           hover:border-amber-600/50
                           hover:text-amber-300
                           hover:scale-[1.03] active:scale-[0.97]
                           transition-all duration-150">
                <span>🏛️</span>
                Long Term
            </button>
        </div>
    );
};

const MessageBubble = ({ role, content, isStreaming = false, isLoading = false, chartData = null, metadata = {}, signal = null, patternSummary = null, technicalSummary = null, indicatorsTable = null, scoreCard = null, suggestedFollowUps = null, newsHeadlines = null, onFollowUpClick = null, onStreamingDone = null, messageId = null, onFeedback = null, responseMode = null }) => {
    const isUser = role === 'user';

    // Use streaming hook for AI messages
    const { displayedText, isComplete } = useStreamingText(
        content,
        !isUser && isStreaming,
        'line',
        2,
        30
    );

    // Notify parent when streaming finishes so it can clear streamingMessageId
    React.useEffect(() => {
        if (isComplete && onStreamingDone) {
            try {
                onStreamingDone();
            } catch (err) {
                // Never let streaming callback crash the message render
                if (typeof console !== 'undefined') console.error('streaming done callback error:', err);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isComplete]);

    // Cards below the text should be hidden while streaming and fade in after.
    // For already-rendered messages (isStreaming=false from the start), show immediately.
    const [cardsVisible, setCardsVisible] = React.useState(!isStreaming);
    React.useEffect(() => {
        if (!isStreaming) setCardsVisible(true);
    }, [isStreaming]);

    // Feedback state: null | 1 (thumbs up) | -1 (thumbs down)
    const [feedbackRating, setFeedbackRating] = React.useState(null);
    const handleFeedback = React.useCallback((rating) => {
        if (feedbackRating !== null) return; // already rated
        setFeedbackRating(rating);
        if (onFeedback && messageId) onFeedback(messageId, rating);
    }, [feedbackRating, onFeedback, messageId]);

    const rawText = (!isUser && isStreaming) ? displayedText : content;
    const textToDisplay = !isUser ? stripResponseChrome(rawText) : rawText;

    const relevantNews = React.useMemo(() => {
        const headlines = Array.isArray(newsHeadlines) ? newsHeadlines : [];
        if (!headlines.length) return [];
        const symbols = (metadata?.symbols || []).map(normalizeSymbol).filter(Boolean);
        // Also build match terms from at_a_glance company name
        const companyName = metadata?.at_a_glance?.company_name || metadata?.at_a_glance?.display_name || '';
        const companyTokens = companyName
            .toLowerCase()
            .replace(/\b(ltd|limited|inc|corp|industries|enterprises|technologies|bank|finance)\b/gi, '')
            .trim()
            .split(/\s+/)
            .filter(t => t.length > 3);
        // No symbol context — only show headlines for market-level responses (not concept/screener queries)
        if (!symbols.length && !companyTokens.length) return [];
        return headlines
            .filter((h) => {
                const titleNorm = normalizeMatchText(h?.title);
                // Match by ticker symbol
                if (symbols.some((sym) => titleNorm.includes(sym))) return true;
                // Match by company name token (e.g. "tata" matches "Tata Consultancy")
                const titleLower = (h?.title || '').toLowerCase();
                if (companyTokens.some(t => titleLower.includes(t))) return true;
                return false;
            })
            .slice(0, 6);
    }, [newsHeadlines, metadata?.symbols, metadata?.at_a_glance]);

    const resolveChartSymbol = React.useCallback((cd, idx) => {
        const fromCd = cd?.chart_metadata?.symbol;
        const fromMeta = (metadata?.symbols || [])[idx] ?? (metadata?.symbols || [])[0];
        return resolveSymbolLabel(fromCd || fromMeta);
    }, [metadata?.symbols]);

    // Derive display symbol label from at_a_glance or metadata
    const primarySymbolLabel = resolveSymbolLabel(metadata?.at_a_glance?.symbol || metadata?.symbols?.[0]);

    return (
        <div className="w-full mb-6">
            {isUser ? (
                // User query — right-aligned pill
                <div className="w-full max-w-4xl mx-auto mb-8 flex justify-end px-4 sm:px-6">
                    <div className="relative inline-flex items-center px-4 py-1.5
                                    bg-[#FDD405]
                                    text-[13px] font-medium
                                    text-zinc-900
                                    shadow-[0_2px_12px_rgba(253,212,5,0.35)]"
                         style={{ borderRadius: '18px 18px 0 18px' }}>
                        {textToDisplay}
                        <svg
                            style={{ position: 'absolute', bottom: 0, right: '-9px', display: 'block' }}
                            width="10" height="16" viewBox="0 0 10 16" fill="none"
                        >
                            <path d="M0 0 C0 10 8 14 10 16 L0 16 Z" fill="#FDD405"/>
                        </svg>
                    </div>
                </div>
            ) : (
                // AI analysis — full-width document
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8">

                    {/* ── Price header (at-a-glance) ──────────────────── */}
                    {metadata?.at_a_glance && (metadata.at_a_glance.price != null || metadata.at_a_glance.change_percent != null) && (() => {
                        const aag = metadata.at_a_glance;
                        const fmtVol = (v) => {
                            if (!v || v <= 0) return null;
                            if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
                            if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
                            if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                            return String(v);
                        };
                        const fmtMcap = (v) => {
                            if (!v || v <= 0) return null;
                            const cr = v / 1e7; // raw INR → crore
                            if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(1)}L Cr`;
                            if (cr >= 1000) return `₹${Math.round(cr / 1000)}K Cr`;
                            if (cr >= 1) return `₹${Math.round(cr)} Cr`;
                            return null;
                        };
                        const companyName = aag.company_name || aag.display_name;
                        const volStr = fmtVol(aag.volume);
                        const mcapStr = fmtMcap(aag.market_cap);
                        return (
                            <div className="mb-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-[#1C1B15] overflow-hidden">
                                {/* Main row: logo, name, price, change */}
                                <div className="flex items-center gap-3 px-4 pt-3 pb-3">
                                    {/* Company logo / letter avatar */}
                                    <div className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {aag.logo_url ? (
                                            <img src={aag.logo_url} alt={primarySymbolLabel} className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <span className="text-sm font-bold text-[#FDD405]">
                                                {(companyName || primarySymbolLabel || '?').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {/* Name block */}
                                    <div className="flex flex-col">
                                        {companyName && (
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-white leading-none mb-0.5">
                                                {companyName}
                                            </span>
                                        )}
                                        {primarySymbolLabel && (
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-none">
                                                NSE: {primarySymbolLabel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1" />
                                    {/* Price + change */}
                                    <div className="flex flex-col items-end">
                                        {aag.price != null && (
                                            <span className="text-[22px] font-bold text-zinc-900 dark:text-white leading-none">
                                                ₹{Number(aag.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        )}
                                        {aag.change_percent != null && (
                                            <span className={clsx(
                                                'text-sm font-medium leading-none mt-0.5',
                                                aag.change_percent >= 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400'
                                            )}>
                                                {aag.change_percent >= 0 ? '+' : ''}{Number(aag.change_percent).toFixed(2)}%{' '}
                                                {aag.change_percent >= 0 ? '↑' : '↓'} today
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Secondary row: P/E, day range, volume, 52w, mcap */}
                                {(aag.pe_ratio != null || aag.high != null || aag.low != null || volStr || aag['52w_high'] != null || mcapStr) && (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 border-t border-zinc-200/50 dark:border-zinc-700/40 pt-2">
                                        {aag.pe_ratio != null && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                P/E <span className="font-semibold text-zinc-700 dark:text-zinc-300">{Number(aag.pe_ratio).toFixed(1)}</span>
                                            </span>
                                        )}
                                        {(aag.high != null || aag.low != null) && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Range{' '}
                                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                    {aag.low != null ? `₹${Number(aag.low).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                                                    {' – '}
                                                    {aag.high != null ? `₹${Number(aag.high).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                                                </span>
                                            </span>
                                        )}
                                        {volStr && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Vol <span className="font-medium text-zinc-700 dark:text-zinc-300">{volStr}</span>
                                            </span>
                                        )}
                                        {(aag['52w_high'] != null || aag['52w_low'] != null) && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                52w{' '}
                                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                    {aag['52w_low'] != null ? `₹${Number(aag['52w_low']).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                                                    {' – '}
                                                    {aag['52w_high'] != null ? `₹${Number(aag['52w_high']).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                                                </span>
                                            </span>
                                        )}
                                        {mcapStr && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                MCap <span className="font-medium text-zinc-700 dark:text-zinc-300">{mcapStr}</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── Chart(s) ────────────────────────────────────── */}
                    <ChartSection
                        chartData={chartData}
                        resolveSymbol={resolveChartSymbol}
                        patternSummary={patternSummary}
                        atAGlance={metadata?.at_a_glance}
                    />

                    {/* ── News headlines ──────────────────────────────── */}
                    {relevantNews.length > 0 && (
                        <div className="mb-5 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700/50">
                                <h4 className="text-[11px] font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">Recent News</h4>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{relevantNews.length} headline{relevantNews.length > 1 ? 's' : ''}</span>
                            </div>
                            <ul>
                                {relevantNews.map((h, i) => {
                                    const sentiment = (h?.sentiment || '').toLowerCase();
                                    const dotColor = sentiment === 'bullish'
                                        ? 'bg-emerald-400'
                                        : sentiment === 'bearish'
                                            ? 'bg-rose-400'
                                            : 'bg-zinc-300 dark:bg-zinc-600';
                                    return (
                                        <li key={h?.url || h?.title || i} className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                                            <span className={clsx('mt-[7px] w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                                            <div className="flex-1 min-w-0">
                                                {h?.url ? (
                                                    <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-800 dark:text-zinc-200 hover:text-amber-700 dark:hover:text-[#FDD405] leading-snug line-clamp-2 transition-colors hover:underline">
                                                        {h.title || 'Untitled'}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2">
                                                        {h?.title || 'Untitled'}
                                                    </p>
                                                )}
                                            </div>
                                            {h.source && (
                                                <div className="text-right flex-shrink-0 ml-2">
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block leading-none mb-0.5">Source:</span>
                                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-none">{h.source}</span>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {/* ── AI text (markdown) ──────────────────────────── */}
                    <div className="prose prose-base max-w-none dark:prose-invert">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => (
                                    <p className="mb-5 last:mb-0 leading-[1.75] text-[15px] text-zinc-700 dark:text-zinc-300 font-normal tracking-normal">
                                        {children}
                                    </p>
                                ),
                                strong: ({ children }) => {
                                    const text = getChildText(children);
                                    if (isPositivePct(text)) {
                                        return (
                                            <strong className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/30">
                                                {children}
                                            </strong>
                                        );
                                    }
                                    if (isNegativePct(text)) {
                                        return (
                                            <strong className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/30">
                                                {children}
                                            </strong>
                                        );
                                    }
                                    if (isPriceLike(text)) {
                                        return (
                                            <strong className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-700/50">
                                                {children}
                                            </strong>
                                        );
                                    }
                                    return (
                                        <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</strong>
                                    );
                                },
                                em: ({ children }) => (
                                    <em className="italic text-zinc-500 dark:text-zinc-400 text-sm">{children}</em>
                                ),
                                ul: ({ children }) => (
                                    <ul className="my-5 space-y-2.5 list-none pl-0">
                                        {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="my-5 space-y-2.5 list-decimal list-inside pl-1">
                                        {children}
                                    </ol>
                                ),
                                li: ({ children, node }) => {
                                    const isUnordered = node?.parent?.tagName === 'ul';
                                    if (isUnordered) {
                                        return (
                                            <li className="leading-[1.7] flex items-start gap-3 ml-0 text-[15px] text-zinc-700 dark:text-zinc-300">
                                                <span className="text-zinc-400 dark:text-zinc-500 select-none mt-[0.3rem] text-base">•</span>
                                                <span className="flex-1">{children}</span>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li className="leading-[1.7] ml-5 text-[15px] text-zinc-700 dark:text-zinc-300">
                                            {children}
                                        </li>
                                    );
                                },
                                code: ({ inline, children }) => {
                                    const text = getChildText(children);
                                    const asTicker = inline && isTickerLike(text);
                                    return inline ? (
                                        <code className={clsx(
                                            "px-1.5 py-0.5 rounded-md text-[0.9em] font-mono",
                                            asTicker
                                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-semibold"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                        )}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-[13px] font-mono overflow-x-auto my-4 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                                            {children}
                                        </code>
                                    );
                                },
                                h1: ({ children }) => (
                                    <h1 className="text-[24px] sm:text-[26px] font-semibold mt-0 mb-5 first:mt-0 text-zinc-900 dark:text-zinc-100 leading-[1.3] tracking-tight">
                                        {children}
                                    </h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-[20px] sm:text-[21px] font-semibold mt-8 mb-4 first:mt-0 text-zinc-900 dark:text-zinc-100 leading-[1.3] tracking-tight">
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="text-[17px] sm:text-[18px] font-semibold mt-6 mb-3 first:mt-0 text-zinc-800 dark:text-zinc-200 leading-[1.4]">
                                        {children}
                                    </h3>
                                ),
                                h4: ({ children }) => (
                                    <h4 className="text-[16px] font-medium mt-5 mb-2.5 text-zinc-700 dark:text-zinc-300 leading-[1.4]">
                                        {children}
                                    </h4>
                                ),
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-700 dark:text-[#FDD405] underline decoration-amber-400/50 dark:decoration-amber-500/50 underline-offset-2 hover:decoration-amber-700 dark:hover:decoration-amber-400 transition-colors"
                                    >
                                        {children}
                                    </a>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-[#FDD405] dark:border-[#FDD405] pl-4 py-2 my-5 rounded-r-lg bg-amber-50/60 dark:bg-amber-950/20 text-zinc-800 dark:text-zinc-200 not-italic font-medium">
                                        {children}
                                    </blockquote>
                                ),
                                table: ({ children }) => (
                                    <div className="my-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1C1B15] shadow-sm">
                                        <table className="min-w-full border-collapse">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                thead: ({ children }) => (
                                    <thead className="bg-[#FDD405]">
                                        {children}
                                    </thead>
                                ),
                                tbody: ({ children }) => (
                                    <tbody className="divide-y divide-[#FDD405]">
                                        {children}
                                    </tbody>
                                ),
                                tr: ({ children, node }) => {
                                    const isHeader = node?.parent?.tagName === 'thead';
                                    return (
                                        <tr className={clsx(
                                            !isHeader && "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors odd:bg-zinc-50/30 dark:odd:bg-zinc-900/20"
                                        )}>
                                            {children}
                                        </tr>
                                    );
                                },
                                th: ({ children }) => (
                                    <th className="px-4 py-3 text-left text-[14px] font-bold text-black border-b border-black/10">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => {
                                    const textStr = [children].flat().map(c => typeof c === 'string' ? c : '').join('');
                                    const isPositive = /\+[\d.]+%/.test(textStr);
                                    const isNegative = /-\d/.test(textStr);
                                    return (
                                        <td className={clsx(
                                            "px-4 py-3 text-[15px] align-top",
                                            isPositive && "text-emerald-600 dark:text-emerald-400 font-medium",
                                            isNegative && "text-rose-600 dark:text-rose-400 font-medium",
                                            !isPositive && !isNegative && "text-zinc-700 dark:text-zinc-300"
                                        )}>
                                            {children}
                                        </td>
                                    );
                                },
                                hr: () => (
                                    <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-600 to-transparent" />
                                ),
                            }}
                        >
                            {textToDisplay}
                        </ReactMarkdown>
                        {!isUser && isStreaming && !isComplete && (
                            <span className="inline-block w-[2px] h-4 bg-zinc-400 dark:bg-zinc-500 ml-0.5 animate-pulse"></span>
                        )}
                    </div>

                    {/* ── Post-text structured sections — hidden while streaming, fade in after ── */}
                    <div className={clsx('transition-opacity duration-500', cardsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none')}>

                    {/* ── Technical indicators chips + support/resistance ── */}
                    <TechnicalSection technicalSummary={technicalSummary} patternSummary={patternSummary} />

                    {/* ── Fundamental score card (Health Score + Financial metrics) ── */}
                    <FundamentalScoreCard
                        scoreCard={scoreCard}
                        symbol={primarySymbolLabel}
                    />

                    {/* ── Expandable indicators table (DB-backed) ──────── */}
                    <IndicatorsTable
                        rows={indicatorsTable}
                        asOfDate={metadata?.indicators_as_of}
                    />

                    {/* ── Pattern Detection & Resistance Alert ─────────── */}
                    {patternSummary && (
                        <PatternDetectionSection patternSummary={patternSummary} />
                    )}

                    {/* ── Data sources footer ──────────────────────────── */}
                    {(metadata?.data_sources || metadata?.data_fetched_at || metadata?.metrics_available || metadata?.fundamentals_as_of) && (
                        <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-700/40">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                                {metadata.data_sources && <span>📊 {metadata.data_sources}</span>}
                                {metadata.fundamentals_as_of && <span className="before:content-['·'] before:mr-2.5">Fundamentals as of {metadata.fundamentals_as_of}</span>}
                                {metadata.data_fetched_at && (
                                  <span className="before:content-['·'] before:mr-2.5">
                                    Price {new Date(metadata.data_fetched_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    {metadata.price_stale && metadata.price_age_seconds && (
                                      <span className="ml-1 text-[#FDD405]">({Math.round(metadata.price_age_seconds)}s delay)</span>
                                    )}
                                  </span>
                                )}
                                {metadata.metrics_available && <span className="before:content-['·'] before:mr-2.5">{metadata.metrics_available}</span>}
                            </div>
                        </div>
                    )}

                    {/* ── Follow-up suggestions ────────────────────────── */}
                    {suggestedFollowUps && suggestedFollowUps.length > 0 && onFollowUpClick && (
                        <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-700/40">
                            <div className="flex flex-wrap gap-2">
                                {suggestedFollowUps.map((label) => (
                                    <button
                                        key={label}
                                        type="button"
                                        aria-label={`Ask: ${label}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!isLoading) onFollowUpClick(label);
                                        }}
                                        disabled={isLoading}
                                        className="px-3.5 py-1.5 text-[13px] rounded-xl bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-800 dark:hover:text-amber-300 border border-zinc-200 dark:border-zinc-700 hover:border-[#FDD405]/60 dark:hover:border-amber-700/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Mode badge + Feedback thumbs ─────────────────── */}
                    {((messageId && onFeedback) || responseMode) && (
                        <div className="mt-3 flex items-center gap-2">
                            {responseMode && (
                                <span className={clsx(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                    responseMode === 'snap'
                                        ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-700 dark:text-[#FDD405]"
                                        : "bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800/60 dark:border-zinc-700 dark:text-zinc-400"
                                )}>
                                    {responseMode === 'snap' ? '⚡ Snap' : '🔍 Analyst'}
                                </span>
                            )}
                            {messageId && onFeedback && (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Helpful"
                                        onClick={() => handleFeedback(1)}
                                        disabled={feedbackRating !== null}
                                        className={clsx(
                                            'p-1.5 rounded-lg transition-all text-sm leading-none',
                                            feedbackRating === 1
                                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                                                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50',
                                            feedbackRating !== null && feedbackRating !== 1 && 'opacity-30 cursor-not-allowed'
                                        )}
                                    >
                                        👍
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Not helpful"
                                        onClick={() => handleFeedback(-1)}
                                        disabled={feedbackRating !== null}
                                        className={clsx(
                                            'p-1.5 rounded-lg transition-all text-sm leading-none',
                                            feedbackRating === -1
                                                ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                                                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50',
                                            feedbackRating !== null && feedbackRating !== -1 && 'opacity-30 cursor-not-allowed'
                                        )}
                                    >
                                        👎
                                    </button>
                                    {feedbackRating !== null && (
                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-0.5">
                                            {feedbackRating === 1 ? 'Thanks!' : 'Got it'}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    </div>{/* end post-text fade wrapper */}
                </div>
            )}
        </div>
    );
};

export default MessageBubble;

import { useState } from 'react';
import { INNER_CARD_DARK } from '../answerKit';
import { InfoTip } from './InfoTip';

/* ─── Technical Score Card ───────────────────────────────────────────────── */
const SIGNAL_NAMES = {
    price_structure: 'Price Structure',
    ema_stack:       'EMA Stack',
    breakout:        'Breakout',
    volume_context:  'Volume',
    rsi:             'RSI',
    macd:            'MACD',
    volatility:      'Volatility',
    weekly_trend:    'Weekly Trend',
    sentiment:       'Sentiment',
    risk_flags:      'Risk Flags',
    sma_regime:      'SMA Regime',
};

/* Metric definitions + what each rating means */
const METRIC_INFO = {
    ema_stack: {
        def: 'Alignment of 8, 21, 50 & 200-day EMAs. When short-term EMAs stack above long-term ones, the trend is healthy.',
        Poor:        'All EMAs inverted, price is in a confirmed downtrend.',
        Weak:        'EMAs partially misaligned, mixed signals, no clear trend.',
        Average:     'EMAs roughly flat, directionless or in transition.',
        Strong:      'EMAs mostly bullishly aligned, uptrend is progressing.',
        Exceptional: 'All EMAs perfectly stacked, strong, sustained uptrend.',
    },
    price_structure: {
        def: 'Sequence of highs and lows. Higher highs + higher lows = bullish structure; lower highs + lower lows = bearish.',
        Poor:        'Lower highs and lower lows, structural downtrend confirmed.',
        Weak:        'Recent highs not being sustained, structure breaking down.',
        Average:     'Sideways / choppy, no clear directional pattern.',
        Strong:      'Higher highs and higher lows, healthy uptrend structure.',
        Exceptional: 'Clean breakout impulse above prior structure, very bullish.',
    },
    breakout: {
        def: 'Detects whether price has broken above key resistance levels, ideally confirmed by volume.',
        Poor:        'Price is well below all resistance, no breakout in sight.',
        Weak:        'Approaching resistance but no clean break yet.',
        Average:     'Minor move at resistance, awaiting volume confirmation.',
        Strong:      'Clean breakout above resistance with volume.',
        Exceptional: 'Explosive volume breakout, high conviction move.',
    },
    volume_context: {
        def: 'Compares recent volume to the 20-day average. High volume on up-moves confirms buying interest.',
        Poor:        'Volume low and declining, no buying interest.',
        Weak:        'Volume below average, lack of conviction.',
        Average:     'Volume near average, neutral, no edge.',
        Strong:      'Volume above average, solid market participation.',
        Exceptional: '2-3× average volume, likely institutional activity.',
    },
    rsi: {
        def: 'RSI (14-day) measures momentum on a 0-100 scale. >70 = overbought, <30 = oversold.',
        Poor:        'RSI below 35, strong bearish momentum, oversold territory.',
        Weak:        'RSI 35-45, bearish momentum, downtrend in place.',
        Average:     'RSI 45-55, neutral, no clear directional edge.',
        Strong:      'RSI 55-70, bullish momentum with room to run.',
        Exceptional: 'RSI in 60-70 zone with upward slope, strong trend momentum.',
    },
    macd: {
        def: 'MACD tracks the difference between two EMAs. Bullish when the signal line crosses above zero.',
        Poor:        'MACD deeply negative and histogram widening, accelerating downtrend.',
        Weak:        'MACD bearish crossover, momentum turning down.',
        Average:     'MACD near zero line, momentum in transition.',
        Strong:      'MACD bullish crossover, momentum turning up.',
        Exceptional: 'MACD strongly positive with rising histogram, strong upward momentum.',
    },
    volatility: {
        def: 'ATR-based measure of recent price swings. High volatility means larger moves in either direction.',
        Poor:        'Very high volatility with a downward bias, unstable and risky.',
        Weak:        'Above-average volatility, unpredictable, wider stops needed.',
        Average:     'Normal volatility, typical market behavior.',
        Strong:      'Controlled, low volatility in an uptrend, healthy grind higher.',
        Exceptional: 'Volatility compression near a base, potential big breakout pending.',
    },
    weekly_trend: {
        def: 'Macro trend direction based on the weekly candle chart. Overrides short-term noise.',
        Poor:        'Weekly chart in clear downtrend, avoid longs entirely.',
        Weak:        'Weekly trend rolling over, caution, headwinds ahead.',
        Average:     'Weekly trend sideways, no macro tailwind or headwind.',
        Strong:      'Weekly uptrend intact, macro direction is supportive.',
        Exceptional: 'Strong weekly uptrend accelerating, maximum macro tailwind.',
    },
    sentiment: {
        def: 'Derived from price action, volume patterns, and momentum divergences to gauge buyer vs. seller control.',
        Poor:        'Strong bearish sentiment, sellers firmly in control.',
        Weak:        'Mild bearish lean, market cautious and defensive.',
        Average:     'Balanced sentiment, no strong conviction either way.',
        Strong:      'Mild bullish sentiment, buyers beginning to step in.',
        Exceptional: 'Very bullish sentiment, high-conviction buying pressure.',
    },
    risk_flags: {
        def: 'Checks for risky conditions: gap-downs, volume spikes on declines, extreme extensions, or proximity to major resistance.',
        Poor:        'Multiple risk flags active, high-risk setup, proceed with caution.',
        Weak:        'Some risk factors present, elevated risk.',
        Average:     '1-2 risk flags, manageable risk, stay alert.',
        Strong:      'Very few risk factors, relatively clean setup.',
        Exceptional: 'Zero risk flags, cleanest possible technical setup.',
    },
    sma_regime: {
        def: 'Position of price relative to the 50-day and 200-day SMAs. The "golden cross" (SMA50 > SMA200) is a bullish regime.',
        Poor:        'Price below both SMA50 & SMA200, deeply bearish regime.',
        Weak:        'Price below SMA200, long-term downtrend regime.',
        Average:     'Price between SMA50 and SMA200, transitional phase.',
        Strong:      'Price above SMA50, medium-term uptrend.',
        Exceptional: 'Price above both SMAs with golden cross, fully bullish regime.',
    },
};

const SCORE_INFO = 'Weighted composite of 11 sub-metrics (EMA Stack, Price Structure, Breakout, Volume, RSI, MACD, Volatility, Weekly Trend, Sentiment, Risk Flags, SMA Regime). Each scored 1-5 and normalized to 100. ≥70 = Strong Pick · 50-69 = Watchlist · 35-49 = Caution · <35 = Avoid.';

const RISK_FLAG_LABELS = {
    EXTENDED_OVERBOUGHT:  'RSI above 75, stock is overbought, pullback risk is elevated.',
    EXTENDED_OVERSOLD:    'RSI below 25, deeply oversold, but may keep falling in downtrends.',
    VERTICAL_CANDLE_AVOID:'Extreme single-bar spike detected, high volatility, avoid chasing.',
    CHOPPY_CONDITIONS:    'Price action is choppy with no clear trend, low-probability setups.',
    LOW_CONFIDENCE_MOVE:  'Recent move happened on weak volume, participation is low, move may not sustain.',
    FAILED_BREAKOUT:      'Breakout attempt failed or reversed, indicates supply overhead.',
    POOR_RISK_REWARD:     'Weak trend with only moderate breakout quality, risk/reward is unfavourable.',
};

const SIG_PALETTE = {
    Exceptional: { bg: 'rgba(34,197,94,0.10)',  color: '#22c55e' },
    Strong:      { bg: 'rgba(74,222,128,0.08)',  color: '#4ade80' },
    Average:     { bg: 'rgba(253,212,5,0.09)',   color: '#FDD405' },
    Weak:        { bg: 'rgba(251,146,60,0.10)',  color: '#fb923c' },
    Poor:        { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444' },
};

export const TechnicalScoreCard = ({ tech }) => {
    const [open, setOpen] = useState(false);
    if (!tech) return null;

    const { score, label, weekly_bias, modules, risk_flags } = tech;
    const signals = modules?.v22_signals || {};

    const scoreColor =
        score >= 70 ? '#22c55e' :
        score >= 50 ? '#FDD405' :
        score >= 35 ? '#fb923c' : '#ef4444';

    const biasMap = {
        WEEKLY_BULLISH: { text: '↑ Weekly Bullish', color: '#22c55e' },
        WEEKLY_NEUTRAL: { text: '→ Weekly Neutral', color: '#FDD405' },
        WEEKLY_BEARISH: { text: '↓ Weekly Bearish', color: '#ef4444' },
    };
    const bias = biasMap[weekly_bias] || { text: weekly_bias || '—', color: '#FDD405' };

    return (
        <div className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3
                           bg-zinc-100 dark:bg-zinc-800
                           hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Technical Score Card</span>
                <span className="text-zinc-400 text-xs">{open ? '∧' : '∨'}</span>
            </button>

            {open && (
                <div className={`p-4 bg-zinc-50 dark:bg-[${INNER_CARD_DARK}] space-y-3`}>

                    {/* Score banner */}
                    <div className="flex items-center justify-between p-3 rounded-xl"
                         style={{ background: `${scoreColor}12`, border: `1.5px solid ${scoreColor}30` }}>
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Technical Quality Score</div>
                                <InfoTip text={SCORE_INFO} />
                            </div>
                            <div className="text-3xl font-extrabold leading-none" style={{ color: scoreColor }}>{score}<span className="text-base font-semibold opacity-60">/100</span></div>
                            <div className="text-xs font-bold mt-1" style={{ color: scoreColor }}>{label}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                      style={{ background: `${bias.color}15`, color: bias.color }}>
                                    {bias.text}
                                </span>
                                <InfoTip text={
                                    METRIC_INFO.weekly_trend
                                        ? `${METRIC_INFO.weekly_trend.def}\n\n${bias.text.replace(/[↑↓→]\s*/,'')}: ${METRIC_INFO.weekly_trend[
                                            weekly_bias === 'WEEKLY_BULLISH' ? 'Strong'
                                            : weekly_bias === 'WEEKLY_BEARISH' ? 'Poor' : 'Average'
                                          ] || ''}`
                                        : null
                                } />
                            </div>
                            {risk_flags?.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                          style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                                        ⚠ {risk_flags.length} risk flag{risk_flags.length > 1 ? 's' : ''}
                                    </span>
                                    <InfoTip text={`Active risk flags:\n\n${risk_flags.map(f => RISK_FLAG_LABELS[f] ? `• ${RISK_FLAG_LABELS[f]}` : `• ${f}`).join('\n')}`} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Signal tiles */}
                    {Object.keys(signals).length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(signals).map(([key, sig]) => {
                                const p    = SIG_PALETTE[sig.label] || SIG_PALETTE.Average;
                                const info = METRIC_INFO[key];
                                const tipText = info
                                    ? `${info.def}${info[sig.label] ? `\n\n${sig.label}: ${info[sig.label]}` : ''}`
                                    : null;
                                return (
                                    <div key={key}
                                         className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50"
                                         style={{ background: p.bg }}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <div className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                                    {SIGNAL_NAMES[key] || key}
                                                </div>
                                                {tipText && <InfoTip text={tipText} />}
                                            </div>
                                            <div className="text-[11px] font-bold" style={{ color: p.color }}>{sig.label}</div>
                                        </div>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0 ml-2"
                                             style={{ backgroundColor: p.color }}>
                                            {sig.score}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Risk flag list */}
                    {risk_flags?.length > 0 && (
                        <div className="space-y-1 pt-1">
                            {risk_flags.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-[11px] text-rose-500 dark:text-rose-400">
                                    <span className="mt-0.5 flex-shrink-0">⚠</span>
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── label classifiers ──────────────────────────────────────────────────── */
// Backend RATING_LABEL: {5:"Exceptional", 4:"Strong", 3:"Average", 2:"Weak", 1:"Poor"}
// "Exceptional" was missing → was falling through to RISK (causing 93/100 + 4 RISK bug)
export const isGoodLabel = (l) =>
    /EXCEPTIONAL|STRONG|CHEAP|ELITE|ZERO.?DEBT|ATTRACTIVE|ABOVE.?AVG|RISING|#\d|STABLE.?HIGH|NEW/i.test(l || '');
export const isNeutralLabel = (l) =>
    /AVERAGE|MODERATE|WATCH|STABILIZ|FAIR/i.test(l || '');

/* ─── helper: compute badge counts from ratios ──────────────────────────── */
export const computeRatings = (ratios) => {
    let strong = 0, watch = 0, risk = 0;
    Object.values(ratios || {}).forEach(r => {
        const lbl = Array.isArray(r) ? r[2] : null;
        if (!lbl) return;
        if (isGoodLabel(lbl)) strong++;
        else if (isNeutralLabel(lbl)) watch++;
        else risk++;
    });
    return { strong, watch, risk };
};

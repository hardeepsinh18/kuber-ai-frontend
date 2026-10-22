import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import HeatmapPanel from './HeatmapPanel';

// Top-right "Heat Map" button over the chat area + the overlay it opens.
// `absolute`, not `fixed`: resolves against Layout's content column so it stays
// put when Venty is embedded inside a partner page (see Layout's sidebar toggle).
const HeatmapLauncher = ({ onAnalyze, hidden }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            {!hidden && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Open market heat map"
                    className="absolute top-3 right-3 z-30 flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-semibold
                               bg-white/80 border-zinc-200 text-zinc-700 hover:border-[#FDD405] hover:text-zinc-900
                               dark:bg-[#181613]/80 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-[#FDD405]/60 dark:hover:text-white
                               backdrop-blur transition-colors"
                >
                    <LayoutGrid size={14} style={{ color: '#FDD405' }} />
                    <span className="hidden sm:inline">Heat Map</span>
                </button>
            )}
            {open && (
                <HeatmapPanel
                    onClose={() => setOpen(false)}
                    onAnalyze={(sym) => { setOpen(false); onAnalyze(sym); }}
                />
            )}
        </>
    );
};

export default HeatmapLauncher;

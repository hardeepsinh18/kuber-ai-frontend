/**
 * Every remaining answer shape — market/sector commentary, concept explanations,
 * "what is a P/E ratio", anything the model answers in prose.
 *
 * These carry no price, signal or scoreCard, so they never qualified for the
 * Quick/Analyst layouts and rendered as bare markdown on the page background.
 * That is what made the product look like it had two different answer UIs. This
 * puts them in the SAME answer box, so every query type lands in one container.
 *
 * It is intentionally the minimum: the shared card shell plus the labelled prose
 * slot. There is no company header, verdict or score because there is no data
 * for them, and inventing those on a financial surface would be worse than
 * leaving them out. Markdown still renders through the caller's existing
 * pipeline, so tables, lists and links behave exactly as before — only the
 * container around them changes.
 */
import { MiniLabel, INNER_CARD } from './answerKit';

const GeneralAnswer = ({ title = null, children }) => (
    <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181613] p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
            {title && (
                <div className={`${INNER_CARD} px-4 py-3`}>
                    <h4 className="text-[14px] font-bold text-zinc-900 dark:text-white">{title}</h4>
                </div>
            )}
            <div className={`${INNER_CARD} px-4 py-3.5`}>
                <MiniLabel>Answer</MiniLabel>
                <div className="mt-1.5">{children}</div>
            </div>
        </div>
    </div>
);

export default GeneralAnswer;

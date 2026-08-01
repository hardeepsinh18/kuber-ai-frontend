// Presentational typeahead dropdown for the chat input's company autocomplete.
// State is owned by the useCompanySuggest hook; this renders hook.dropdownProps.
export default function CompanySuggest({ results, open, active, onHover, onPick, direction = 'down' }) {
  if (!open || !results?.length) return null;

  const posClass = direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div
      role="listbox"
      className={`absolute left-0 right-0 z-50 ${posClass}
                  max-h-72 overflow-y-auto rounded-xl py-1
                  border border-zinc-200 dark:border-zinc-700/80
                  bg-white dark:bg-[#1a1a1a]
                  shadow-xl shadow-black/10 dark:shadow-black/50`}
    >
      {results.map((item, i) => {
        const isActive = i === active;
        return (
          <button
            key={item.ticker}
            type="button"
            role="option"
            aria-selected={isActive}
            // onMouseDown (not onClick) so selection fires before textarea blur.
            onMouseDown={(e) => { e.preventDefault(); onPick(item); }}
            onMouseEnter={() => onHover(i)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                        ${isActive ? 'bg-amber-50 dark:bg-amber-950/25' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
          >
            <span className="flex-shrink-0 min-w-[54px] px-1.5 py-0.5 rounded-md text-[10.5px] font-bold tracking-wide
                             text-zinc-700 dark:text-zinc-200
                             bg-zinc-100 dark:bg-zinc-800 text-center">
              {item.symbol}
            </span>
            <span className="flex-1 truncate text-[13px] text-zinc-800 dark:text-zinc-100">
              {item.name}
            </span>
            <span className="flex-shrink-0 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500">
              STOCK
            </span>
          </button>
        );
      })}
    </div>
  );
}

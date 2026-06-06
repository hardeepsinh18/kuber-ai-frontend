import React, { useState } from 'react';

// ── Type → group mapping ────────────────────────────────────────────────────
const TYPE_CONFIG = {
  // Web sources
  web_search:       { group: 'Web',       label: 'Web' },
  web_intelligence: { group: 'Web',       label: 'Web' },
  // Documents
  nse_filing:           { group: 'Documents', label: 'NSE Filing' },
  ir_pdf:               { group: 'Documents', label: 'IR Report' },
  earnings_transcript:  { group: 'Documents', label: 'Earnings Transcript' },
  annual_report:        { group: 'Documents', label: 'Annual Report' },
  // Default
  database:         { group: 'Database',  label: 'Database' },
};

const GROUP_ORDER = ['Market Data', 'Documents', 'Database', 'Web'];

const GROUP_ICONS = {
  'Market Data': (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  Documents: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Database: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  ),
  Web: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
    </svg>
  ),
};

function getFavicon(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
  } catch {
    return null;
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function groupSources(sourceDocuments) {
  const groups = {};

  // Always add Market Data as a static source (Fyers price feed)
  groups['Market Data'] = [{ _static: true, title: 'Price Feed', snippet: 'Real-time NSE market data' }];

  for (const doc of sourceDocuments) {
    const config = TYPE_CONFIG[doc.type] || { group: 'Web', label: doc.type || 'Source' };
    const g = config.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push({ ...doc, _label: config.label });
  }

  return GROUP_ORDER.filter(g => groups[g] && groups[g].length > 0)
    .map(g => ({ group: g, items: groups[g] }));
}

function SourceItem({ item }) {
  const favicon = item.url ? getFavicon(item.url) : null;
  const hostname = item.url ? getHostname(item.url) : null;

  if (item._static) {
    return (
      <div className="flex items-start gap-2 py-1.5">
        <div className="w-4 h-4 flex-shrink-0 mt-0.5 rounded bg-gray-700 flex items-center justify-center">
          <span className="text-[8px] text-gray-400">DB</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-300 font-medium truncate">{item.title}</p>
          {item.snippet && <p className="text-[11px] text-gray-500 truncate">{item.snippet}</p>}
        </div>
      </div>
    );
  }

  const inner = (
    <div className="flex items-start gap-2 py-1.5 group">
      <div className="w-4 h-4 flex-shrink-0 mt-0.5">
        {favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded" onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-4 h-4 rounded bg-gray-700" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-300 font-medium truncate group-hover:text-blue-400 transition-colors">
          {item.title || hostname || 'Source'}
        </p>
        {(item.snippet || item._label) && (
          <p className="text-[11px] text-gray-500 truncate">
            {item._label && <span className="text-gray-600">{item._label} · </span>}
            {item.snippet}
          </p>
        )}
        {hostname && <p className="text-[10px] text-gray-600 truncate mt-0.5">{hostname}</p>}
      </div>
    </div>
  );

  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-white/5 rounded -mx-1 px-1 transition-colors">
      {inner}
    </a>
  ) : (
    <div className="block">{inner}</div>
  );
}

function GroupSection({ group, items }) {
  const [expanded, setExpanded] = useState(group === 'Web');
  const icon = GROUP_ICONS[group];
  const count = items.length;

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
      >
        <span className="text-gray-500">{icon}</span>
        <span className="text-xs font-semibold text-gray-400">{group}</span>
        <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full ml-auto">{count}</span>
        <svg
          className={`w-3 h-3 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-0.5 ml-5 border-l border-gray-800 pl-3 space-y-0.5">
          {items.map((item, i) => (
            <SourceItem key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SourcesPanel({ sourceDocuments = [] }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const groups = groupSources(sourceDocuments);
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="px-4 max-w-3xl mx-auto w-full mb-3">
      {/* Pill toggle */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors group"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span>Sources ({totalCount})</span>
        <svg
          className={`w-3 h-3 transition-transform ${panelOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {panelOpen && (
        <div className="mt-2 bg-[#111] border border-gray-800 rounded-xl p-3 space-y-1">
          {groups.map(({ group, items }) => (
            <GroupSection key={group} group={group} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

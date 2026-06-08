import { useTheme } from '../contexts/ThemeContext';

// ─── Inline token renderer ────────────────────────────────────────────────────
// Supports: [label](url)  `code`  **bold**  *italic*
// PLUS: rule/ID chips like F-01, R-02, F01, etc.  and  ==highlight==
function renderInline(text, isDark) {
  const source = String(text || '');

  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|==.+?==)/g;
  const parts = source.split(tokenRegex).filter((p) => p !== '');

  return parts.map((part, idx) => {
    // Markdown link
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        return (
          <a
            key={idx}
            href={m[2]}
            target="_blank"
            rel="noreferrer"
            className={
              isDark
                ? 'font-medium text-blue-300 underline decoration-blue-500/70 underline-offset-2 hover:text-blue-200'
                : 'font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800'
            }
          >
            {m[1]}
          </a>
        );
      }
    }
    // Inline code  — detect rule-ID pattern inside backticks for chip styling
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      const isRuleId = /^[A-Z]-?\d+$/.test(inner) || /^[A-Z]{1,3}-\d+$/.test(inner);
      if (isRuleId) {
        return <RuleChip key={idx} id={inner} isDark={isDark} />;
      }
      return (
        <code
          key={idx}
          className={
            isDark
              ? 'rounded border border-sky-700/60 bg-sky-950/45 px-1.5 py-0.5 font-mono text-[0.88em] text-sky-200'
              : 'rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[0.88em] text-sky-900'
          }
        >
          {inner}
        </code>
      );
    }
    // Bold
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className={isDark ? 'font-semibold text-slate-100' : 'font-semibold text-slate-900'}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Italic
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className={isDark ? 'italic text-slate-300' : 'italic text-slate-700'}>
          {part.slice(1, -1)}
        </em>
      );
    }
    // Highlight ==text==
    if (part.startsWith('==') && part.endsWith('==')) {
      return (
        <mark
          key={idx}
          className={isDark ? 'rounded bg-amber-900/50 px-0.5 text-amber-200' : 'rounded bg-amber-100 px-0.5 text-amber-900'}
        >
          {part.slice(2, -2)}
        </mark>
      );
    }

    // Plain text — scan for bare rule IDs like (F-01) or F-01 surrounded by spaces/punctuation
    return <InlineWithChips key={idx} text={part} isDark={isDark} />;
  });
}

// Renders plain text but converts bare rule-ID patterns (e.g. F-01, R-02, F16) to chips
function InlineWithChips({ text, isDark }) {
  const rulePattern = /\b([A-Z]{1,3}-\d{1,3})\b/g;
  const parts = text.split(rulePattern);
  if (parts.length === 1) return <span>{text}</span>;

  return (
    <>
      {parts.map((p, i) =>
        rulePattern.test(p) || /^[A-Z]{1,3}-\d{1,3}$/.test(p) ? (
          <RuleChip key={i} id={p} isDark={isDark} />
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// ─── Rule ID chip ─────────────────────────────────────────────────────────────
function RuleChip({ id, isDark }) {
  return (
    <span
      className={
        isDark
          ? 'mx-0.5 inline-flex items-center rounded border border-sky-700/60 bg-sky-950/50 px-1.5 py-px font-mono text-[0.82em] font-semibold text-sky-300'
          : 'mx-0.5 inline-flex items-center rounded border border-sky-200 bg-sky-50 px-1.5 py-px font-mono text-[0.82em] font-semibold text-sky-700'
      }
    >
      {id}
    </span>
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────
const SEVERITY_STYLES = {
  critical: {
    dark: 'bg-red-950/60 border-red-700/60 text-red-300',
    light: 'bg-red-50 border-red-200 text-red-700',
    dot: 'bg-red-500',
  },
  high: {
    dark: 'bg-orange-950/60 border-orange-700/60 text-orange-300',
    light: 'bg-orange-50 border-orange-200 text-orange-700',
    dot: 'bg-orange-500',
  },
  medium: {
    dark: 'bg-yellow-950/60 border-yellow-700/60 text-yellow-300',
    light: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    dot: 'bg-yellow-500',
  },
  low: {
    dark: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300',
    light: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  info: {
    dark: 'bg-sky-950/60 border-sky-700/60 text-sky-300',
    light: 'bg-sky-50 border-sky-200 text-sky-700',
    dot: 'bg-sky-500',
  },
  passed: {
    dark: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300',
    light: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  failed: {
    dark: 'bg-red-950/60 border-red-700/60 text-red-300',
    light: 'bg-red-50 border-red-200 text-red-700',
    dot: 'bg-red-500',
  },
};

function SeverityBadge({ label, isDark }) {
  const key = label.toLowerCase();
  const style = SEVERITY_STYLES[key] || SEVERITY_STYLES.info;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75em] font-semibold uppercase tracking-wide ${
        isDark ? style.dark : style.light
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

// ─── Score pill  e.g.  [[score:42%:critical]]  ────────────────────────────────
function ScorePill({ value, severity, isDark }) {
  const key = (severity || 'info').toLowerCase();
  const style = SEVERITY_STYLES[key] || SEVERITY_STYLES.info;
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-sm font-bold ${
        isDark ? style.dark : style.light
      }`}
    >
      {value}
    </span>
  );
}

// ─── Callout block  > [!NOTE] / [!WARNING] / [!TIP] / [!IMPORTANT] ───────────
const CALLOUT_META = {
  note:      { icon: 'ℹ', dark: 'border-sky-600 bg-sky-950/30 text-sky-200',      light: 'border-sky-400 bg-sky-50 text-sky-800' },
  tip:       { icon: '💡', dark: 'border-emerald-600 bg-emerald-950/30 text-emerald-200', light: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  warning:   { icon: '⚠', dark: 'border-amber-600 bg-amber-950/30 text-amber-200', light: 'border-amber-400 bg-amber-50 text-amber-800' },
  important: { icon: '🔴', dark: 'border-red-600 bg-red-950/30 text-red-200',      light: 'border-red-400 bg-red-50 text-red-800' },
  caution:   { icon: '⚡', dark: 'border-orange-600 bg-orange-950/30 text-orange-200', light: 'border-orange-400 bg-orange-50 text-orange-800' },
};

function Callout({ type, content, isDark }) {
  const meta = CALLOUT_META[type.toLowerCase()] || CALLOUT_META.note;
  return (
    <div
      className={`rounded-r-lg border-l-4 px-4 py-3 text-sm leading-7 ${
        isDark ? meta.dark : meta.light
      }`}
    >
      <p className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide text-[0.78em]">
        <span>{meta.icon}</span>
        {type}
      </p>
      <div>{renderInline(content, isDark)}</div>
    </div>
  );
}

// ─── Domain section header ────────────────────────────────────────────────────
const DOMAIN_ICONS = {
  connectivity: '🔗',
  compute:      '⚙️',
  data:         '🗄️',
  security:     '🔒',
  reliability:  '📊',
  performance:  '⚡',
  observability:'🔭',
  storage:      '💾',
  network:      '🌐',
  identity:     '🪪',
};

function DomainHeader({ title, isDark }) {
  const key = title.toLowerCase().trim();
  const icon = Object.entries(DOMAIN_ICONS).find(([k]) => key.includes(k))?.[1] || '📋';
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
        isDark
          ? 'bg-slate-800/70 border border-slate-700'
          : 'bg-slate-100 border border-slate-200'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <h4
        className={`text-sm font-bold uppercase tracking-widest ${
          isDark ? 'text-slate-100' : 'text-slate-800'
        }`}
      >
        {title}
      </h4>
    </div>
  );
}

// ─── Table parser ─────────────────────────────────────────────────────────────
function parseTableLines(tableLines) {
  const rows = tableLines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const norm = l.replace(/^\|/, '').replace(/\|$/, '');
      return norm.split('|').map((c) => c.trim());
    });

  const isSep = (cells) =>
    Array.isArray(cells) &&
    cells.length > 0 &&
    cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s+/g, '')));

  const hasHeader = rows.length > 1 && isSep(rows[1]);
  return {
    header: hasHeader ? rows[0] : [],
    body: hasHeader ? rows.slice(2) : rows,
  };
}

// Detect severity-like words in a table cell to auto-badge them
function renderTableCell(cell, isDark) {
  const severityWords = /^(critical|high|medium|low|passed|failed|info)$/i;
  const trimmed = cell.trim();
  if (severityWords.test(trimmed)) {
    return <SeverityBadge label={trimmed} isDark={isDark} />;
  }
  // Rule ID chip
  if (/^[A-Z]{1,3}-\d{1,3}$/.test(trimmed)) {
    return <RuleChip id={trimmed} isDark={isDark} />;
  }
  return renderInline(cell, isDark);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StructuredReport({ text }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const lines = String(text || '').split('\n');
  const nodes = [];

  let paragraphBuffer = [];
  let listType = null;
  let listItems = [];
  let tableLines = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];

  // ── flush helpers ─────────────────────────────────────────────────────────
  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const value = paragraphBuffer.join(' ').trim();
    if (value) {
      nodes.push(
        <p key={`p-${nodes.length}`} className={isDark ? 'text-sm leading-7 text-slate-300' : 'text-sm leading-7 text-slate-700'}>
          {renderInline(value, isDark)}
        </p>
      );
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listItems.length) return;

    if (listType === 'task') {
      nodes.push(
        <ul key={`task-${nodes.length}`} className={`space-y-2 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2" style={{ paddingLeft: `${(item.indent || 0) * 16}px` }}>
              <span
                aria-hidden="true"
                className={
                  item.checked
                    ? isDark
                      ? 'mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-600 bg-emerald-900 text-[10px] text-emerald-200'
                      : 'mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-300 bg-emerald-100 text-[10px] text-emerald-700'
                    : isDark
                    ? 'mt-[3px] inline-flex h-4 w-4 shrink-0 rounded border border-slate-600 bg-slate-800'
                    : 'mt-[3px] inline-flex h-4 w-4 shrink-0 rounded border border-slate-300 bg-white'
                }
              >
                {item.checked ? '✓' : ''}
              </span>
              <span>{renderInline(item.text, isDark)}</span>
            </li>
          ))}
        </ul>
      );
    } else if (listType === 'ol') {
      // Group items by their indent level so we can show clean sequential counters per level
      const counters = {};
      nodes.push(
        <ol key={`ol-${nodes.length}`} className={`space-y-1 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {listItems.map((item, idx) => {
            const indent = item.indent || 0;
            if (item.subType === 'ul') {
              // Nested bullet inside an OL
              return (
                <li key={idx} className="flex items-start gap-2" style={{ paddingLeft: `${indent * 20}px` }}>
                  <span className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
                  <span>{renderInline(item.text, isDark)}</span>
                </li>
              );
            }
            counters[indent] = (counters[indent] || 0) + 1;
            Object.keys(counters).forEach((k) => { if (Number(k) > indent) delete counters[k]; });
            const num = counters[indent];
            return (
              <li key={idx} className="flex items-baseline gap-2.5" style={{ paddingLeft: `${indent * 20}px` }}>
                <span className={`shrink-0 min-w-[1.4rem] text-right font-mono text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {num}.
                </span>
                <span>{renderInline(item.text, isDark)}</span>
              </li>
            );
          })}
        </ol>
      );
    } else {
      // UL — detect Rule Failed cards, sub-headings, nested OL items, regular bullets
      const olCounters = {};
      nodes.push(
        <ul key={`ul-${nodes.length}`} className={`space-y-1 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {listItems.map((item, idx) => {
            const txt = item.text || '';
            const indent = item.indent || 0;

            // Nested ordered item inside a UL
            if (item.subType === 'ol') {
              olCounters[indent] = (olCounters[indent] || 0) + 1;
              Object.keys(olCounters).forEach((k) => { if (Number(k) > indent) delete olCounters[k]; });
              const num = olCounters[indent];
              return (
                <li key={idx} className="flex items-baseline gap-2.5 list-none" style={{ paddingLeft: `${indent * 20}px` }}>
                  <span className={`shrink-0 min-w-[1.4rem] text-right font-mono text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {num}.
                  </span>
                  <span>{renderInline(txt, isDark)}</span>
                </li>
              );
            }

            // Rule Failed / Rule Passed bullet — render as a card, no bullet dot
            const ruleMatch = txt.match(/^\*\*Rule (Failed|Passed):\*\*\s+`?([A-Z]{1,3}-?\d+)`?\s*(.*)/s);
            if (ruleMatch) {
              const passed = ruleMatch[1].toLowerCase() === 'passed';
              return (
                <li key={idx} className="list-none" style={{ paddingLeft: `${indent * 16}px` }}>
                  <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm ${
                    passed
                      ? isDark ? 'border-emerald-700/50 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50'
                      : isDark ? 'border-red-800/40 bg-red-950/20' : 'border-red-200 bg-red-50'
                  }`}>
                    <span className={`font-semibold ${passed ? isDark ? 'text-emerald-300' : 'text-emerald-700' : isDark ? 'text-red-300' : 'text-red-700'}`}>
                      Rule {ruleMatch[1]}:
                    </span>
                    <RuleChip id={ruleMatch[2]} isDark={isDark} />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{renderInline(ruleMatch[3], isDark)}</span>
                  </div>
                </li>
              );
            }

            // Sub-heading bullet: bold text at root indent — also resets OL counters
            const isSubHeading = indent === 0 && (
              /^\*\*.+(\*\*:?|:\*\*)/.test(txt) ||
              /^[A-Z].{3,}\(`[A-Z]-?\d+`\):$/.test(txt)
            );
            if (isSubHeading) {
              // Reset OL counters so next numbered list starts from 1
              Object.keys(olCounters).forEach((k) => delete olCounters[k]);
              return (
                <li key={idx} className="flex items-center gap-2 pt-2 pb-0.5 list-none">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isDark ? 'bg-sky-400' : 'bg-sky-500'}`} />
                  <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                    {renderInline(txt, isDark)}
                  </span>
                </li>
              );
            }

            return (
              <li key={idx} className="flex items-start gap-2 list-none" style={{ paddingLeft: `${indent * 16}px` }}>
                <span className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full ${indent > 0 ? isDark ? 'bg-slate-600' : 'bg-slate-300' : isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
                <span>{renderInline(txt, isDark)}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    listType = null;
    listItems = [];
  };

  const flushTable = () => {
    if (!tableLines.length) return;
    const { header, body } = parseTableLines(tableLines);
    nodes.push(
      <div
        key={`table-${nodes.length}`}
        className={`overflow-x-auto rounded-xl border shadow-sm ${
          isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <table className="min-w-full border-collapse text-left text-sm">
          {header.length > 0 && (
            <thead>
              <tr className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
                {header.map((cell, i) => (
                  <th
                    key={i}
                    className={`border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                      isDark
                        ? 'border-slate-700 text-slate-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {renderInline(cell, isDark)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={
                  isDark
                    ? 'border-b border-slate-800 transition-colors hover:bg-slate-800/50'
                    : 'border-b border-slate-100 transition-colors hover:bg-slate-50/70'
                }
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-4 py-3 align-top text-sm ${
                      cIdx === 0 ? 'whitespace-nowrap' : ''
                    } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  >
                    {renderTableCell(cell, isDark)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    nodes.push(
      <div key={`code-${nodes.length}`} className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 shadow-sm">
        {codeLang && (
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="ml-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {codeLang}
            </span>
          </div>
        )}
        <pre className="p-4 text-xs leading-6 text-slate-100">
          <code>{codeLines.join('\n')}</code>
        </pre>
      </div>
    );
    codeLines = [];
    codeLang = '';
  };

  // ── line-by-line parser ───────────────────────────────────────────────────
  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    // Fenced code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    // Blank line — flush paragraph and table but NOT lists (lists continue across blank lines in MD)
    if (!line) {
      flushParagraph();
      flushTable();
      return;
    }

    // Table row
    if (line.startsWith('|')) {
      flushParagraph();
      flushList();
      tableLines.push(line);
      return;
    }

    flushTable();

    // Compute indent level from rawLine leading whitespace
    const indentSpaces = rawLine.match(/^(\s*)/)[1].replace(/\t/g, '  ').length;
    const indentLevel = Math.floor(indentSpaces / 2);

    // Task list
    const taskMatch = line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (taskMatch) {
      flushParagraph();
      if (listType !== 'task') { flushList(); listType = 'task'; }
      listItems.push({ checked: taskMatch[1].toLowerCase() === 'x', text: taskMatch[2], indent: indentLevel });
      return;
    }

    // Ordered list — match "1." style
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      // If currently in a UL at a deeper indent, treat as nested (keep UL open, tag item as 'ol')
      if (listType === 'ul' && indentLevel > 0) {
        listItems.push({ text: olMatch[2], indent: indentLevel, subType: 'ol' });
      } else {
        if (listType !== 'ol') { flushList(); listType = 'ol'; }
        listItems.push({ text: olMatch[2], indent: indentLevel });
      }
      return;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      flushParagraph();
      // If currently in an OL at a deeper indent, treat as nested bullet
      if (listType === 'ol' && indentLevel > 0) {
        listItems.push({ text: line.slice(2).trim(), indent: indentLevel, subType: 'ul' });
      } else {
        if (listType !== 'ul') { flushList(); listType = 'ul'; }
        listItems.push({ text: line.slice(2).trim(), indent: indentLevel });
      }
      return;
    }

    flushList();

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const value = headingMatch[2];

      // H3 → domain section header (ALL-CAPS pattern common in evaluation reports)
      if (level === 3 && /^[A-Z][A-Z\s]+$/.test(value)) {
        nodes.push(<DomainHeader key={`dh-${nodes.length}`} title={value} isDark={isDark} />);
        return;
      }

      if (level <= 2) {
        nodes.push(
          <h2
            key={`h${level}-${nodes.length}`}
            className={`pb-2 text-xl font-bold tracking-tight ${
              level === 1
                ? isDark
                  ? 'mt-8 border-b-2 border-slate-600 text-slate-50 first:mt-0'
                  : 'mt-8 border-b-2 border-slate-300 text-slate-900 first:mt-0'
                : isDark
                ? 'mt-6 border-b border-slate-700 text-slate-100 first:mt-0'
                : 'mt-6 border-b border-slate-200 text-slate-800 first:mt-0'
            }`}
          >
            {renderInline(value, isDark)}
          </h2>
        );
      } else if (level === 3) {
        nodes.push(
          <h3
            key={`h3-${nodes.length}`}
            className={`mt-5 text-base font-semibold uppercase tracking-wide ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            {renderInline(value, isDark)}
          </h3>
        );
      } else {
        nodes.push(
          <h4
            key={`h4-${nodes.length}`}
            className={`mt-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
          >
            {renderInline(value, isDark)}
          </h4>
        );
      }
      return;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      nodes.push(
        <hr key={`hr-${nodes.length}`} className={isDark ? 'my-5 border-slate-700' : 'my-5 border-slate-200'} />
      );
      return;
    }

    // GitHub-style callouts: > [!WARNING] text
    const calloutMatch = line.match(/^>\s+\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)$/i);
    if (calloutMatch) {
      flushParagraph();
      nodes.push(
        <Callout
          key={`callout-${nodes.length}`}
          type={calloutMatch[1]}
          content={calloutMatch[2]}
          isDark={isDark}
        />
      );
      return;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushParagraph();
      nodes.push(
        <blockquote
          key={`bq-${nodes.length}`}
          className={`rounded-r-lg border-l-4 px-4 py-2.5 text-sm leading-7 ${
            isDark
              ? 'border-sky-600 bg-sky-950/30 text-slate-300'
              : 'border-sky-300 bg-sky-50 text-slate-700'
          }`}
        >
          {renderInline(line.slice(2).trim(), isDark)}
        </blockquote>
      );
      return;
    }

    // Special annotation lines: **Rule Failed:** `F-01` ...
    const ruleFailedMatch = line.match(/^\*\*Rule (Failed|Passed):\*\*\s+`?([A-Z]{1,3}-?\d+)`?\s*(.*)/);
    if (ruleFailedMatch) {
      flushParagraph();
      const passed = ruleFailedMatch[1].toLowerCase() === 'passed';
      nodes.push(
        <div
          key={`rf-${nodes.length}`}
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm ${
            passed
              ? isDark ? 'border-emerald-700/50 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50'
              : isDark ? 'border-red-800/40 bg-red-950/20' : 'border-red-200 bg-red-50'
          }`}
        >
          <span className={`font-semibold ${passed ? isDark ? 'text-emerald-300' : 'text-emerald-700' : isDark ? 'text-red-300' : 'text-red-700'}`}>
            Rule {ruleFailedMatch[1]}:
          </span>
          <RuleChip id={ruleFailedMatch[2]} isDark={isDark} />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            {renderInline(ruleFailedMatch[3], isDark)}
          </span>
        </div>
      );
      return;
    }

    // Severity badge lines: **Severity:** Critical
    const severityMatch = line.match(/^\*\*Severity:\*\*\s+(\w+)/);
    if (severityMatch) {
      flushParagraph();
      nodes.push(
        <div key={`sev-${nodes.length}`} className="flex items-center gap-2 text-sm">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Severity:</span>
          <SeverityBadge label={severityMatch[1]} isDark={isDark} />
        </div>
      );
      return;
    }

    // Score lines: **Score:** 42% or Overall: 42/100
    const scoreMatch = line.match(/^\*\*(Score|Overall Score|Evaluation Score):\*\*\s+(.+)/);
    if (scoreMatch) {
      flushParagraph();
      const scoreVal = scoreMatch[2].trim();
      // Determine severity from numeric score
      const numMatch = scoreVal.match(/(\d+)/);
      const num = numMatch ? parseInt(numMatch[1], 10) : 50;
      const sev = num >= 80 ? 'passed' : num >= 60 ? 'medium' : num >= 40 ? 'high' : 'critical';
      nodes.push(
        <div key={`score-${nodes.length}`} className="flex items-center gap-3">
          <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {scoreMatch[1]}:
          </span>
          <ScorePill value={scoreVal} severity={sev} isDark={isDark} />
        </div>
      );
      return;
    }

    paragraphBuffer.push(line);
  });

  // Final flushes
  flushParagraph();
  flushList();
  flushTable();
  if (inCodeBlock) flushCode();

  if (!nodes.length) {
    return (
      <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>
        No report generated.
      </p>
    );
  }

  return (
    <article className={`space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
      {nodes}
    </article>
  );
}
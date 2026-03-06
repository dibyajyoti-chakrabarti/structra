import { useTheme } from '../contexts/ThemeContext';

function renderInline(text, isDark) {
  const source = String(text || '');
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = source.split(tokenRegex).filter((part) => part !== '');

  return parts.map((part, idx) => {
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, label, href] = match;
        return (
          <a
            key={`link-${idx}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={
              isDark
                ? 'font-medium text-blue-300 underline decoration-blue-500/70 underline-offset-2 hover:text-blue-200'
                : 'font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800'
            }
          >
            {label}
          </a>
        );
      }
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`code-${idx}`}
          className={
            isDark
              ? 'rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-100'
              : 'rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-800'
          }
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`strong-${idx}`} className={isDark ? 'font-semibold text-slate-100' : 'font-semibold text-slate-900'}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`em-${idx}`} className={isDark ? 'italic text-slate-300' : 'italic text-slate-700'}>{part.slice(1, -1)}</em>;
    }
    return <span key={`txt-${idx}`}>{part}</span>;
  });
}

function parseTableLines(tableLines) {
  const rows = tableLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.replace(/^\|/, '').replace(/\|$/, '');
      return normalized.split('|').map((cell) => cell.trim());
    });

  const isSeparatorRow = (cells) =>
    Array.isArray(cells) &&
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));

  const hasHeader = rows.length > 1 && isSeparatorRow(rows[1]);
  return {
    header: hasHeader ? rows[0] : [],
    body: hasHeader ? rows.slice(2) : rows,
  };
}

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

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const value = paragraphBuffer.join(' ').trim();
    if (value) {
      nodes.push(
        <p key={`p-${nodes.length}`} className={isDark ? 'text-sm leading-7 text-slate-200' : 'text-sm leading-7 text-slate-700'}>
          {renderInline(value, isDark)}
        </p>
      );
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const listClass = isDark
      ? 'space-y-1.5 pl-6 text-sm leading-7 text-slate-200'
      : 'space-y-1.5 pl-6 text-sm leading-7 text-slate-700';

    if (listType === 'ol') {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className={`list-decimal ${listClass}`}>
          {listItems.map((item, idx) => (
            <li key={`oli-${idx}`}>{renderInline(item, isDark)}</li>
          ))}
        </ol>
      );
    } else {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className={`list-disc ${listClass}`}>
          {listItems.map((item, idx) => (
            <li key={`uli-${idx}`}>{renderInline(item, isDark)}</li>
          ))}
        </ul>
      );
    }
    listType = null;
    listItems = [];
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    const { header, body } = parseTableLines(tableLines);

    nodes.push(
      <div
        key={`table-${nodes.length}`}
        className={
          isDark
            ? 'overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 shadow-sm'
            : 'overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm'
        }
      >
        <table className="min-w-full border-collapse text-left text-sm">
          {header.length > 0 && (
            <thead className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
              <tr>
                {header.map((cell, idx) => (
                  <th
                    key={`th-${idx}`}
                    className={
                      isDark
                        ? 'border-b border-slate-700 px-4 py-3 font-semibold text-slate-100'
                        : 'border-b border-slate-200 px-4 py-3 font-semibold text-slate-900'
                    }
                  >
                    {renderInline(cell, isDark)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, rIdx) => (
              <tr key={`tr-${rIdx}`} className={isDark ? 'odd:bg-slate-900 even:bg-slate-800/65' : 'odd:bg-white even:bg-slate-50/60'}>
                {row.map((cell, cIdx) => (
                  <td
                    key={`td-${rIdx}-${cIdx}`}
                    className={
                      isDark
                        ? 'border-b border-slate-700 px-4 py-3 align-top text-slate-200'
                        : 'border-b border-slate-100 px-4 py-3 align-top text-slate-700'
                    }
                  >
                    {renderInline(cell, isDark)}
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
    if (codeLines.length === 0) return;
    nodes.push(
      <div key={`code-${nodes.length}`} className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-sm">
        {codeLang && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{codeLang}</p>}
        <pre className="text-xs leading-6 text-slate-100">
          <code>{codeLines.join('\n')}</code>
        </pre>
      </div>
    );
    codeLines = [];
    codeLang = '';
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

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

    if (!line) {
      flushParagraph();
      flushList();
      flushTable();
      return;
    }

    if (line.startsWith('|')) {
      flushParagraph();
      flushList();
      tableLines.push(line);
      return;
    }

    flushTable();

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(orderedMatch[1]);
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(line.slice(2).trim());
      return;
    }

    flushList();

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const value = headingMatch[2];
      if (level === 1 || level === 2) {
        nodes.push(
          <h3
            key={`h-main-${nodes.length}`}
            className={
              isDark
                ? 'mt-6 border-b border-slate-700 pb-2 text-xl font-semibold tracking-tight text-slate-100 first:mt-0'
                : 'mt-6 border-b border-slate-200 pb-2 text-xl font-semibold tracking-tight text-slate-900 first:mt-0'
            }
          >
            {renderInline(value, isDark)}
          </h3>
        );
      } else if (level === 3) {
        nodes.push(
          <h4
            key={`h-sub-${nodes.length}`}
            className={isDark ? 'mt-5 text-base font-semibold uppercase tracking-wide text-slate-200' : 'mt-5 text-base font-semibold uppercase tracking-wide text-slate-800'}
          >
            {renderInline(value, isDark)}
          </h4>
        );
      } else {
        nodes.push(
          <h5 key={`h-min-${nodes.length}`} className={isDark ? 'mt-4 text-sm font-semibold text-slate-200' : 'mt-4 text-sm font-semibold text-slate-800'}>
            {renderInline(value, isDark)}
          </h5>
        );
      }
      return;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      nodes.push(<hr key={`hr-${nodes.length}`} className={isDark ? 'my-4 border-slate-700' : 'my-4 border-slate-200'} />);
      return;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      nodes.push(
        <blockquote
          key={`bq-${nodes.length}`}
          className={
            isDark
              ? 'rounded-r-md border-l-4 border-sky-600 bg-sky-950/30 px-4 py-2 text-sm leading-7 text-slate-200'
              : 'rounded-r-md border-l-4 border-sky-300 bg-sky-50 px-4 py-2 text-sm leading-7 text-slate-700'
          }
        >
          {renderInline(line.slice(2).trim(), isDark)}
        </blockquote>
      );
      return;
    }

    paragraphBuffer.push(line);
  });

  flushParagraph();
  flushList();
  flushTable();
  if (inCodeBlock) flushCode();

  if (nodes.length === 0) {
    return <p className={isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>No report generated.</p>;
  }

  return <article className={isDark ? 'space-y-3 text-slate-200' : 'space-y-3 text-slate-700'}>{nodes}</article>;
}

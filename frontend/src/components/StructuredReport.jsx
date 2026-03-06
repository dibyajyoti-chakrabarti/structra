function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`strong-${idx}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`txt-${idx}`}>{part}</span>;
  });
}

export default function StructuredReport({ text }) {
  const lines = String(text || '').split('\n');
  const nodes = [];
  let listItems = [];
  let tableLines = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="list-disc space-y-1 pl-5 text-sm text-gray-700">
        {listItems.map((item, idx) => (
          <li key={`li-${idx}`}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;
    nodes.push(
      <pre
        key={`table-${nodes.length}`}
        className="overflow-x-auto rounded-md border border-gray-200 bg-white p-2 text-xs leading-6 text-gray-700"
      >
        {tableLines.join('\n')}
      </pre>
    );
    tableLines = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      flushTable();
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushTable();
      listItems.push(line.slice(2).trim());
      return;
    }

    if (line.startsWith('|')) {
      flushList();
      tableLines.push(line);
      return;
    }

    flushList();
    flushTable();

    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`h2-${idx}`} className="mt-4 border-b border-gray-200 pb-1 text-base font-semibold text-gray-900">
          {line.slice(3)}
        </h3>
      );
      return;
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`h3-${idx}`} className="mt-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
          {line.slice(4)}
        </h4>
      );
      return;
    }

    nodes.push(
      <p key={`p-${idx}`} className="text-sm leading-6 text-gray-700">
        {renderInline(line)}
      </p>
    );
  });

  flushList();
  flushTable();

  if (nodes.length === 0) {
    return <p className="text-sm text-gray-500">No report generated.</p>;
  }

  return <div className="space-y-2">{nodes}</div>;
}

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple, elegant parser for standard AI-generated Markdown response
  const lines = content.split('\n');
  
  return (
    <div className="space-y-3 text-sm text-slate-300 leading-relaxed font-sans">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={index} className="text-base font-semibold text-slate-100 mt-4 mb-2 border-b border-slate-800 pb-1">
              {trimmed.replace('###', '').trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={index} className="text-lg font-bold text-emerald-400 mt-5 mb-2">
              {trimmed.replace('##', '').trim()}
            </h3>
          );
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={index} className="text-xl font-extrabold text-white mt-6 mb-3">
              {trimmed.replace('#', '').trim()}
            </h2>
          );
        }

        // Bold highlights e.g. **text**
        if (trimmed.includes('**')) {
          // simple inline bold replacement
          const parts = trimmed.split('**');
          return (
            <p key={index} className="my-1">
              {parts.map((part, pIdx) => (
                pIdx % 2 === 1 ? <strong key={pIdx} className="text-emerald-300 font-semibold">{part}</strong> : part
              ))}
            </p>
          );
        }

        // Bullet points
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const bulletText = trimmed.substring(1).trim();
          return (
            <ul key={index} className="list-disc pl-5 my-1 space-y-1">
              <li className="text-slate-300">
                {bulletText.includes('`') ? renderCodeSpan(bulletText) : bulletText}
              </li>
            </ul>
          );
        }

        // Ordered lists
        const matchNumber = trimmed.match(/^(\d+)\.\s(.*)/);
        if (matchNumber) {
          const itemText = matchNumber[2];
          return (
            <ol key={index} className="list-decimal pl-5 my-1 space-y-1">
              <li className="text-slate-300">
                {itemText.includes('`') ? renderCodeSpan(itemText) : itemText}
              </li>
            </ol>
          );
        }

        // Code block or logs
        if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
          return (
            <pre key={index} className="bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-emerald-400 overflow-x-auto my-2">
              {trimmed.replace(/`/g, '')}
            </pre>
          );
        }

        // Standard empty line
        if (trimmed === '') {
          return <div key={index} className="h-2" />;
        }

        // Default paragraph
        return (
          <p key={index} className="my-1 text-slate-300">
            {trimmed.includes('`') ? renderCodeSpan(trimmed) : trimmed}
          </p>
        );
      })}
    </div>
  );
}

function renderCodeSpan(text: string) {
  const parts = text.split('`');
  return parts.map((part, index) => (
    index % 2 === 1 ? (
      <code key={index} className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs font-mono text-rose-400">
        {part}
      </code>
    ) : part
  ));
}

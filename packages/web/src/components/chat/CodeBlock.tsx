'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Simple syntax highlighting via CSS classes — no external lib needed
function tokenize(code: string, language: string): React.ReactNode[] {
  if (!language || language === 'text') {
    return [
      <span key="0" className="text-gray-300">
        {code}
      </span>,
    ];
  }

  // Very lightweight tokenizer for common patterns
  const lines = code.split('\n');
  return lines.map((line, i) => (
    <span key={i} className="block">
      {highlightLine(line, language)}
      {i < lines.length - 1 ? '' : ''}
    </span>
  ));
}

function highlightLine(line: string, lang: string): React.ReactNode {
  // Keywords
  const keywords = {
    jsx: [
      'const',
      'let',
      'var',
      'function',
      'return',
      'import',
      'export',
      'default',
      'from',
      'if',
      'else',
      'for',
      'while',
      'class',
      'extends',
      'new',
      'this',
      'typeof',
      'instanceof',
      'null',
      'undefined',
      'true',
      'false',
      'async',
      'await',
      'try',
      'catch',
      'throw',
    ],
    tsx: [
      'const',
      'let',
      'var',
      'function',
      'return',
      'import',
      'export',
      'default',
      'from',
      'if',
      'else',
      'for',
      'class',
      'interface',
      'type',
      'extends',
      'implements',
      'async',
      'await',
      'null',
      'undefined',
      'true',
      'false',
    ],
    python: [
      'def',
      'class',
      'import',
      'from',
      'return',
      'if',
      'else',
      'elif',
      'for',
      'while',
      'in',
      'not',
      'and',
      'or',
      'True',
      'False',
      'None',
      'try',
      'except',
      'with',
      'as',
      'pass',
      'lambda',
    ],
    sql: [
      'SELECT',
      'FROM',
      'WHERE',
      'JOIN',
      'LEFT',
      'RIGHT',
      'INNER',
      'ON',
      'AND',
      'OR',
      'ORDER',
      'BY',
      'GROUP',
      'HAVING',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'TABLE',
      'INDEX',
      'AS',
      'IN',
      'NOT',
      'NULL',
      'IS',
    ],
  };
  const kw = keywords[lang as keyof typeof keywords] || keywords.jsx;

  // Simple regex-based approach
  const remaining = line;

  // Comment detection
  if (remaining.trimStart().startsWith('//') || remaining.trimStart().startsWith('#')) {
    return (
      <span key="comment" className="text-gray-500 italic">
        {line}
      </span>
    );
  }

  // String detection (simple)
  const tokenPattern =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\w+\b|[^\w\s]|\s+)/g;
  const tokens = line.match(tokenPattern) || [];

  return (
    <>
      {tokens.map((token, ti) => {
        if (
          (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) &&
          token.length > 1
        ) {
          return (
            <span key={ti} className="text-green-400">
              {token}
            </span>
          );
        }
        if (kw.includes(token)) {
          return (
            <span key={ti} className="text-purple-400 font-medium">
              {token}
            </span>
          );
        }
        if (/^\d+(\.\d+)?$/.test(token)) {
          return (
            <span key={ti} className="text-amber-400">
              {token}
            </span>
          );
        }
        if (/^[A-Z][a-zA-Z0-9]*$/.test(token)) {
          return (
            <span key={ti} className="text-blue-400">
              {token}
            </span>
          );
        }
        if (/^[a-z][a-zA-Z0-9]*\(/.test(token) || (ti > 0 && tokens[ti - 1] === '.')) {
          return (
            <span key={ti} className="text-yellow-300">
              {token}
            </span>
          );
        }
        return (
          <span key={ti} className="text-gray-300">
            {token}
          </span>
        );
      })}
    </>
  );
}

const languageLabels: Record<string, string> = {
  jsx: 'JSX',
  tsx: 'TSX',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  sql: 'SQL',
  bash: 'Bash',
  sh: 'Shell',
  css: 'CSS',
  html: 'HTML',
  json: 'JSON',
  yaml: 'YAML',
  text: 'Plain Text',
};

export default function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const label = languageLabels[language.toLowerCase()] || language.toUpperCase();

  return (
    <div className="code-block my-2 min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/8"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <span className="text-xs font-medium text-purple-400/80 font-mono">{label}</span>
        <button
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs text-white/40 transition-colors duration-150 hover:bg-white/8 hover:text-white/80 active:scale-95"
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <div className="max-w-full overflow-x-auto p-4">
        <pre className="min-w-full text-sm leading-relaxed font-mono whitespace-pre">
          {tokenize(code, language.toLowerCase())}
        </pre>
      </div>
    </div>
  );
}

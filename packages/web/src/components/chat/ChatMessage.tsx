'use client';

import React, { useState } from 'react';
import { Message } from '@/types';
import CodeBlock from './CodeBlock';

interface ChatMessageProps {
  message: Message;
  programIcon?: string;
}

function parseMarkdown(content: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let segIdx = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      segments.push(
        <div key={`text-${segIdx++}`} className="markdown-content text-sm leading-relaxed">
          {renderInlineMarkdown(textBefore)}
        </div>
      );
    }
    // Code block
    segments.push(
      <CodeBlock key={`code-${segIdx++}`} language={match[1] || 'text'} code={match[2].trim()} />
    );
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    segments.push(
      <div key={`text-${segIdx++}`} className="markdown-content text-sm leading-relaxed">
        {renderInlineMarkdown(content.slice(lastIndex))}
      </div>
    );
  }

  return segments;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines
    .map((line, i) => {
      if (!line.trim()) return <br key={i} />;

      // Heading
      if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={i}>{line.slice(2)}</h1>;

      // List item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2">
            <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineText(line.slice(2))}</span>
          </div>
        );
      }

      // Numbered list
      const numMatch = line.match(/^(\d+)\. (.+)/);
      if (numMatch) {
        return (
          <div key={i} className="flex gap-2">
            <span className="text-purple-400 flex-shrink-0 font-medium text-xs mt-0.5 w-4">
              {numMatch[1]}.
            </span>
            <span>{renderInlineText(numMatch[2])}</span>
          </div>
        );
      }

      // Table row (simple detection)
      if (line.startsWith('|') && line.endsWith('|')) {
        if (line.includes('---')) return null;
        const cells = line.split('|').filter((c) => c.trim());
        return (
          <div key={i} className="flex gap-2 text-xs border-b border-white/8 py-1">
            {cells.map((cell, ci) => (
              <span key={ci} className={`flex-1 ${ci === 0 ? 'text-white/60' : 'text-white/80'}`}>
                {renderInlineText(cell.trim())}
              </span>
            ))}
          </div>
        );
      }

      // Blockquote
      if (line.startsWith('> ')) {
        return <blockquote key={i}>{renderInlineText(line.slice(2))}</blockquote>;
      }

      return <p key={i}>{renderInlineText(line)}</p>;
    })
    .filter(Boolean) as React.ReactNode[];
}

function renderInlineText(text: string): React.ReactNode {
  // Bold, italic, inline code
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let idx = 0;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={idx++}>{text.slice(last, m.index)}</span>);
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={idx++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={idx++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={idx++}>{token.slice(1, -1)}</code>);
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>);
  return parts.length > 0 ? parts : text;
}

function formatTimestamp(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({ message, programIcon = '🤖' }: ChatMessageProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 mb-4 fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowTimestamp(!showTimestamp);
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 self-end mb-1"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}
        >
          <span>{programIcon}</span>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 ${isUser ? 'bubble-user text-white' : 'bubble-assistant text-white/90'}`}
          style={{ wordBreak: 'break-word' }}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className="space-y-1">{parseMarkdown(message.content)}</div>
          )}
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <span className="text-[10px] text-white/30 px-1 fade-in">
            {formatTimestamp(
              message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
            )}
          </span>
        )}
      </div>
    </div>
  );
}

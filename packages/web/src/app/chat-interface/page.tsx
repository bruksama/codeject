'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  ArrowUp,
  WifiOff,
  RefreshCcw,
  Trash2,
  Share2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import ChatMessage from '@/components/chat/ChatMessage';
import StreamingIndicator from '@/components/ui/StreamingIndicator';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import { useAppStore } from '@/stores/useAppStore';

// Overflow menu
function OverflowMenu({
  onClose,
  onReconnect,
  onClearHistory,
  onShare,
  isConnected,
}: {
  onClose: () => void;
  onReconnect: () => void;
  onClearHistory: () => void;
  onShare: () => void;
  isConnected: boolean;
}) {
  return (
    <div
      className="absolute top-full right-0 mt-2 w-52 rounded-2xl overflow-hidden z-50 scale-in"
      style={{
        background: 'rgba(15,15,26,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {[
        {
          icon: <RefreshCcw size={15} />,
          label: isConnected ? 'Reconnect' : 'Connect',
          action: onReconnect,
          color: 'text-white/80',
        },
        {
          icon: <Share2 size={15} />,
          label: 'Share Conversation',
          action: onShare,
          color: 'text-white/80',
        },
        {
          icon: <Trash2 size={15} />,
          label: 'Clear History',
          action: onClearHistory,
          color: 'text-red-400',
        },
      ].map((item, i, arr) => (
        <button
          key={i}
          onClick={() => {
            item.action();
            onClose();
          }}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium ${item.color} hover:bg-white/6 active:bg-white/10 transition-colors duration-100 ${
            i < arr.length - 1 ? 'border-b border-white/6' : ''
          }`}
        >
          <span className="opacity-70">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Scroll-to-bottom button
function ScrollToBottomButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full glass-elevated flex items-center justify-center active:scale-90 transition-transform duration-100 fade-in"
      aria-label="Scroll to bottom"
    >
      <ChevronDown size={18} className="text-white/60" />
    </button>
  );
}

// Suggested prompts for empty state
const SUGGESTED_PROMPTS = [
  'Explain the codebase structure',
  'Help me fix this bug',
  'Write unit tests for this function',
  'Refactor for better readability',
  'Add TypeScript types',
  'Review for security issues',
];

export default function ChatInterfacePage() {
  const router = useRouter();
  const { sessions, activeSessionId, addMessage, updateMessage, updateSession } = useAppStore();

  const session = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [session?.messages?.length, scrollToBottom]);

  // Track scroll for scroll-to-bottom button
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  };

  // Close overflow on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    if (showOverflow) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOverflow]);

  // BACKEND INTEGRATION: Replace this mock streaming with actual WebSocket/SSE connection
  // to the CLI process running on the local machine or via Cloudflare tunnel
  const simulateStreamingResponse = useCallback(async () => {
    if (!session) return;
    setIsStreaming(true);

    await new Promise((r) => setTimeout(r, 600));

    const responses = [
      `I'll help you with that! Let me analyze the code.\n\n\`\`\`typescript\n// Here's a clean implementation:\nconst processData = async (input: string[]): Promise<Result> => {\n  const filtered = input.filter(Boolean);\n  const mapped = await Promise.all(\n    filtered.map(async (item) => transform(item))\n  );\n  return { data: mapped, count: mapped.length };\n};\n\`\`\`\n\nThis approach uses **async/await** with \`Promise.all\` for parallel processing, which is significantly faster than sequential iteration.`,
      `Great question! Here's what I recommend:\n\n**Key considerations:**\n- Use \`useCallback\` for memoizing event handlers\n- Apply \`useMemo\` for expensive computations\n- Keep state as local as possible\n\n\`\`\`jsx\nconst MemoizedComponent = React.memo(({ data }) => {\n  const handleClick = useCallback(() => {\n    console.log(data);\n  }, [data]);\n  \n  return <button onClick={handleClick}>{data.label}</button>;\n});\n\`\`\`\n\nThis prevents unnecessary re-renders when parent state changes.`,
      `I've reviewed your code. Here are the main issues:\n\n1. **Missing error boundary** — wrap async operations in try/catch\n2. **Race condition** in the useEffect cleanup\n3. **Memory leak** — subscription not unsubscribed\n\n\`\`\`javascript\nuseEffect(() => {\n  let cancelled = false;\n  \n  fetchData().then(data => {\n    if (!cancelled) setState(data);\n  });\n  \n  return () => { cancelled = true; };\n}, []);\n\`\`\``,
    ];

    const responseContent = responses[Math.floor(Math.random() * responses.length)];
    const msgId = `msg-${Date.now()}`;

    addMessage(session.id, {
      id: msgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    });

    // Simulate character-by-character streaming
    let streamed = '';
    const chars = responseContent.split('');
    for (let i = 0; i < chars.length; i++) {
      await new Promise((r) => setTimeout(r, 12 + Math.random() * 8));
      streamed += chars[i];
      updateMessage(session.id, msgId, { content: streamed });
    }

    updateMessage(session.id, msgId, { isStreaming: false });
    setIsStreaming(false);
  }, [session, addMessage, updateMessage]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isStreaming || !session) return;

    const msgId = `msg-${Date.now()}`;
    addMessage(session.id, {
      id: msgId,
      role: 'user',
      content,
      timestamp: new Date(),
    });

    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => scrollToBottom(), 100);
    await simulateStreamingResponse();
  }, [inputValue, isStreaming, session, addMessage, scrollToBottom, simulateStreamingResponse]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const handleReconnect = () => {
    if (!session) return;
    updateSession(session.id, { status: 'connecting' });
    // BACKEND INTEGRATION: Trigger WebSocket reconnection to CLI process
    setTimeout(() => {
      updateSession(session.id, { status: 'connected' });
      toast.success('Reconnected to ' + session.cliProgram.name);
    }, 1500);
  };

  const handleClearHistory = () => {
    if (!session) return;
    updateSession(session.id, { messages: [] });
    toast.success('Conversation history cleared');
  };

  const handleShare = () => {
    toast.info('Share feature coming soon');
  };

  const handleAttachment = () => {
    toast.info('Tap to insert a file path, e.g. ~/projects/app/src/index.ts');
  };

  if (!session) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4"
        style={{ background: '#08080f', paddingTop: 'env(safe-area-inset-top, 44px)' }}
      >
        <div className="text-4xl">💬</div>
        <p className="text-white/50 text-sm">No session selected</p>
        <button
          onClick={() => router.push('/sessions-list')}
          className="accent-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform"
        >
          Go to Sessions
        </button>
      </div>
    );
  }

  const hasMessages = session.messages.length > 0;

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: '#08080f', paddingTop: 'env(safe-area-inset-top, 44px)' }}
    >
      {/* Top navbar */}
      <header
        className="flex items-center gap-3 px-3 py-3 flex-shrink-0"
        style={{
          background: 'rgba(8,8,15,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <button
          onClick={() => router.push('/sessions-list')}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-90 transition-all duration-150 flex-shrink-0"
          aria-label="Back to sessions"
        >
          <ArrowLeft size={18} className="text-white/70" />
        </button>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{session.cliProgram.icon}</span>
            <span className="text-sm font-semibold text-white/90 truncate">{session.name}</span>
            <ConnectionBadge status={session.status} showLabel size="sm" />
          </div>
          <p className="text-[11px] text-white/35 font-mono truncate mt-0.5">
            {session.workspacePath}
          </p>
        </div>

        {/* Overflow menu trigger */}
        <div className="relative flex-shrink-0" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow(!showOverflow)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-90 transition-all duration-150"
            aria-label="Session options"
            aria-expanded={showOverflow}
          >
            <MoreVertical size={18} className="text-white/70" />
          </button>
          {showOverflow && (
            <OverflowMenu
              onClose={() => setShowOverflow(false)}
              onReconnect={handleReconnect}
              onClearHistory={handleClearHistory}
              onShare={handleShare}
              isConnected={session.status === 'connected'}
            />
          )}
        </div>
      </header>

      {/* Disconnected banner */}
      {(session.status === 'disconnected' || session.status === 'error') && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 mx-3 mt-2 rounded-xl fade-in"
          style={{
            background:
              session.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
            border: `1px solid ${session.status === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(107,114,128,0.2)'}`,
          }}
        >
          <WifiOff
            size={14}
            className={session.status === 'error' ? 'text-red-400' : 'text-gray-400'}
          />
          <span className="text-xs text-white/60 flex-1">
            {session.status === 'error'
              ? 'Connection error — CLI process may have crashed'
              : 'Session disconnected — messages are read-only'}
          </span>
          <button
            onClick={handleReconnect}
            className="text-xs font-semibold text-purple-400 active:opacity-70"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Messages area */}
      <main
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: '16px' }}
      >
        {!hasMessages ? (
          /* Empty state with suggested prompts */
          <div className="flex flex-col items-center py-10 fade-in">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              {session.cliProgram.icon}
            </div>
            <h3 className="text-base font-semibold text-white/80 mb-1">
              {session.cliProgram.name} ready
            </h3>
            <p className="text-sm text-white/35 text-center mb-6 px-4">
              Ask anything about your code in{' '}
              <span className="font-mono text-purple-400/70">{session.workspacePath}</span>
            </p>

            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/25 mb-3">
              Suggested prompts
            </p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white/80 active:scale-[0.98] transition-all duration-100"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Date separator */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-[10px] text-white/25 font-medium">Today</span>
              <div className="flex-1 h-px bg-white/6" />
            </div>

            {/* Messages */}
            {session.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                programIcon={session.cliProgram.icon}
              />
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <StreamingIndicator
                programIcon={session.cliProgram.icon}
                programName={session.cliProgram.name}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="absolute bottom-28 right-4 z-20">
          <ScrollToBottomButton onClick={() => scrollToBottom()} />
        </div>
      )}

      {/* Input area */}
      <div
        className="flex-shrink-0 px-3 py-3"
        style={{
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(8,8,15,0.9)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Attachment button */}
          <button
            onClick={handleAttachment}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 hover:bg-white/8 active:scale-90 transition-all duration-100"
            aria-label="Attach file path"
          >
            <Paperclip size={17} className="text-white/40" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Claude Code…"
            className="auto-grow-textarea flex-1 bg-transparent text-sm text-white/90 placeholder-white/25 focus:outline-none resize-none py-1.5"
            rows={1}
            disabled={isStreaming || session.status === 'disconnected'}
            aria-label="Message input"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || session.status === 'disconnected'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 transition-all duration-150 ${
              inputValue.trim() && !isStreaming && session.status !== 'disconnected'
                ? 'accent-gradient accent-glow-sm active:scale-90'
                : 'bg-white/8 opacity-40'
            }`}
            aria-label="Send message"
          >
            {isStreaming ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp size={16} className="text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Character count & shortcuts hint */}
        <div className="flex items-center justify-between px-1 mt-1.5">
          {inputValue.length > 200 ? (
            <span
              className={`text-[10px] ${inputValue.length > 2000 ? 'text-red-400' : 'text-white/25'}`}
            >
              {inputValue.length} chars
            </span>
          ) : (
            <span />
          )}
          <span className="text-[10px] text-white/15">↵ send · ⇧↵ newline</span>
        </div>
      </div>
    </div>
  );
}

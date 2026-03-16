'use client';

import { type MutableRefObject, useEffect, useRef } from 'react';
import { type ConnectionStatus, type TerminalSnapshot } from '@/types';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

interface TerminalViewportProps {
  onSizeChange: (size: { cols: number; rows: number }) => void;
  snapshot: TerminalSnapshot;
  status: ConnectionStatus;
}

export function TerminalViewport({ onSizeChange, snapshot, status }: TerminalViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const lastSentSizeRef = useRef<{ cols: number; rows: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      scrollback: 5000,
      theme: {
        background: '#06060d',
        brightBlack: '#6b7280',
        brightBlue: '#60a5fa',
        brightCyan: '#67e8f9',
        brightGreen: '#4ade80',
        brightMagenta: '#c084fc',
        brightRed: '#f87171',
        brightWhite: '#f8fafc',
        brightYellow: '#facc15',
        cursor: '#f8fafc',
        foreground: '#f8fafc',
        selectionBackground: 'rgba(124,58,237,0.35)',
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();
    publishSize(terminal, onSizeChange, lastSentSizeRef);
    const handleClick = () => terminal.focus();
    container.addEventListener('click', handleClick);
    terminal.focus();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      publishSize(terminal, onSizeChange, lastSentSizeRef);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('click', handleClick);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [onSizeChange]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.options.cursorBlink = status === 'connected';
  }, [status]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.reset();
    terminal.write(snapshot.content);
  }, [snapshot.content, snapshot.seq]);

  return (
    <div
      className="glass-card min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-black/40"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div
        className="h-full w-full px-3 py-4"
        ref={containerRef}
        style={{
          background:
            'radial-gradient(circle at top, rgba(124,58,237,0.14), transparent 42%), rgba(6,6,13,0.96)',
        }}
      />
    </div>
  );
}

function publishSize(
  terminal: Terminal,
  onSizeChange: (size: { cols: number; rows: number }) => void,
  lastSentSizeRef: MutableRefObject<{ cols: number; rows: number } | null>
) {
  const nextSize = { cols: terminal.cols, rows: terminal.rows };
  if (
    lastSentSizeRef.current?.cols === nextSize.cols &&
    lastSentSizeRef.current?.rows === nextSize.rows
  ) {
    return;
  }
  lastSentSizeRef.current = nextSize;
  onSizeChange(nextSize);
}

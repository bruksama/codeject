'use client';

interface CliProgramCommandPreviewProps {
  commandPreview: string;
}

export function CliProgramCommandPreview({ commandPreview }: CliProgramCommandPreviewProps) {
  return (
    <div
      className="fade-in rounded-xl px-4 py-3"
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-widest text-white/25">
        Preview
      </p>
      <code className="break-all text-xs font-mono leading-relaxed text-green-400/80">
        $ {commandPreview}
      </code>
    </div>
  );
}

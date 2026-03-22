'use client';

interface CliProgramEditorProgramInfoCardProps {
  programId: string;
  sessionsUsingCount: number;
}

export function CliProgramEditorProgramInfoCard({
  programId,
  sessionsUsingCount,
}: CliProgramEditorProgramInfoCardProps) {
  return (
    <div
      className="fade-in rounded-2xl p-4"
      style={{
        background: 'rgba(124,58,237,0.05)',
        border: '1px solid rgba(124,58,237,0.15)',
      }}
    >
      <p className="mb-3 text-[0.625rem] font-semibold uppercase tracking-widest text-purple-400/50">
        Program Info
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">ID</span>
          <code className="text-xs text-white/42">{programId}</code>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/45">Sessions using this preset</span>
          <span className="text-white/68">{sessionsUsingCount}</span>
        </div>
      </div>
    </div>
  );
}

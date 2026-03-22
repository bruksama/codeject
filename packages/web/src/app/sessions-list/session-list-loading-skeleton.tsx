'use client';

export function SessionListLoadingSkeleton() {
  return (
    <div className="glass-card mb-3 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="skeleton h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-3">
            <div className="skeleton h-4 w-32 rounded-md" />
            <div className="skeleton h-3 w-20 rounded-md" />
          </div>
          <div className="skeleton h-3 w-24 rounded-md" />
          <div className="skeleton h-3 w-full rounded-md" />
          <div className="skeleton h-3 w-3/4 rounded-md" />
        </div>
      </div>
    </div>
  );
}

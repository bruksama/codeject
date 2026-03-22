'use client';

import { useRouter } from 'next/navigation';
import { ChatInterfaceSessionView } from '@/app/chat-interface/chat-interface-session-view';
import { useAppStore } from '@/stores/useAppStore';
import { selectActiveSessionOrFirstSession } from '@/stores/use-app-store-selectors';

export default function ChatInterfacePage() {
  const router = useRouter();
  const session = useAppStore(selectActiveSessionOrFirstSession);

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#08080f] px-6 text-center">
        <p className="text-base leading-7 text-white/50">No session selected</p>
        <button
          className="interactive-focus-ring accent-gradient rounded-xl px-5 py-3 text-sm font-semibold text-white"
          onClick={() => router.push('/sessions-list')}
          type="button"
        >
          Go to Sessions
        </button>
      </div>
    );
  }

  return (
    <ChatInterfaceSessionView
      key={session.id}
      onBackToSessions={() => router.push('/sessions-list')}
      session={session}
    />
  );
}

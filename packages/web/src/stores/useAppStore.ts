'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Session, Message, CliProgram } from '@/types';

// BACKEND INTEGRATION: Replace mock data with API calls to your backend service
// that manages CLI process spawning, message routing, and session persistence

const defaultCliPrograms: CliProgram[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    command: 'claude',
    icon: '🤖',
    defaultWorkingDir: '~/projects',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    command: 'codex',
    icon: '⚡',
    defaultWorkingDir: '~/projects',
  },
  {
    id: 'aider',
    name: 'Aider',
    command: 'aider',
    icon: '🧠',
    defaultWorkingDir: '~/projects',
  },
  {
    id: 'continue',
    name: 'Continue',
    command: 'continue',
    icon: '▶️',
    defaultWorkingDir: '~/projects',
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content:
      'Can you help me refactor this React component to use hooks instead of class components?',
    timestamp: new Date('2026-03-15T10:30:00'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Sure! Here's how you can convert your class component to a functional component with hooks:\n\n**Before (Class Component):**\n\`\`\`jsx\nclass MyComponent extends React.Component {\n  constructor(props) {\n    super(props);\n    this.state = { count: 0 };\n  }\n  \n  componentDidMount() {\n    document.title = \`Count: \${this.state.count}\`;\n  }\n  \n  render() {\n    return (\n      <button onClick={() => this.setState({ count: this.state.count + 1 })}>\n        Count: {this.state.count}\n      </button>\n    );\n  }\n}\n\`\`\`\n\n**After (Functional with Hooks):**\n\`\`\`jsx\nfunction MyComponent() {\n  const [count, setCount] = useState(0);\n  \n  useEffect(() => {\n    document.title = \`Count: \${count}\`;\n  }, [count]);\n  \n  return (\n    <button onClick={() => setCount(count + 1)}>\n      Count: {count}\n    </button>\n  );\n}\n\`\`\`\n\nThe key changes are:\n- Replace \`this.state\` with \`useState\`\n- Replace \`componentDidMount\` with \`useEffect\`\n- Remove the class boilerplate entirely`,
    timestamp: new Date('2026-03-15T10:30:45'),
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'What about componentDidUpdate? How does that map to useEffect?',
    timestamp: new Date('2026-03-15T10:32:00'),
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: `Great question! \`componentDidUpdate\` maps to \`useEffect\` with a **dependency array**.\n\n\`\`\`jsx\n// componentDidUpdate equivalent\nuseEffect(() => {\n  // This runs after every render where 'value' changed\n  console.log('value changed:', value);\n}, [value]); // dependency array\n\`\`\`\n\nHere's the full mapping:\n\n| Lifecycle | Hook Equivalent |\n|-----------|----------------|\n| componentDidMount | useEffect(() => {}, []) |\n| componentDidUpdate | useEffect(() => {}, [deps]) |\n| componentWillUnmount | useEffect(() => { return () => {} }, []) |\n\nIf you need to run cleanup, return a function from useEffect:\n\n\`\`\`jsx\nuseEffect(() => {\n  const subscription = someService.subscribe(value);\n  return () => subscription.unsubscribe(); // cleanup\n}, [value]);\n\`\`\``,
    timestamp: new Date('2026-03-15T10:32:30'),
  },
];

const defaultSessions: Session[] = [
  {
    id: 'session-1',
    name: 'codeject-frontend',
    cliProgram: defaultCliPrograms[0],
    workspacePath: '~/projects/codeject',
    messages: mockMessages,
    status: 'connected',
    createdAt: new Date('2026-03-15T09:00:00'),
    lastMessageAt: new Date('2026-03-15T10:32:30'),
  },
  {
    id: 'session-2',
    name: 'api-refactor',
    cliProgram: defaultCliPrograms[1],
    workspacePath: '~/projects/backend-api',
    messages: [
      {
        id: 'msg-s2-1',
        role: 'user',
        content: 'Optimize this database query for better performance',
        timestamp: new Date('2026-03-15T08:15:00'),
      },
      {
        id: 'msg-s2-2',
        role: 'assistant',
        content: 'I can help optimize that query. Let me analyze the execution plan first...',
        timestamp: new Date('2026-03-15T08:15:30'),
      },
    ],
    status: 'idle',
    createdAt: new Date('2026-03-14T14:00:00'),
    lastMessageAt: new Date('2026-03-15T08:15:30'),
  },
  {
    id: 'session-3',
    name: 'ml-pipeline',
    cliProgram: defaultCliPrograms[2],
    workspacePath: '~/projects/ml-experiments',
    messages: [
      {
        id: 'msg-s3-1',
        role: 'user',
        content: 'Help me write a data preprocessing pipeline in Python',
        timestamp: new Date('2026-03-14T16:00:00'),
      },
    ],
    status: 'disconnected',
    createdAt: new Date('2026-03-14T16:00:00'),
    lastMessageAt: new Date('2026-03-14T16:00:00'),
  },
  {
    id: 'session-4',
    name: 'auth-service',
    cliProgram: defaultCliPrograms[3],
    workspacePath: '~/projects/auth-microservice',
    messages: [
      {
        id: 'msg-s4-1',
        role: 'user',
        content: 'Implement JWT refresh token rotation',
        timestamp: new Date('2026-03-13T11:00:00'),
      },
      {
        id: 'msg-s4-2',
        role: 'assistant',
        content: 'Here is a secure implementation of JWT refresh token rotation...',
        timestamp: new Date('2026-03-13T11:01:00'),
      },
    ],
    status: 'error',
    createdAt: new Date('2026-03-13T11:00:00'),
    lastMessageAt: new Date('2026-03-13T11:01:00'),
  },
  {
    id: 'session-5',
    name: 'design-system',
    cliProgram: defaultCliPrograms[0],
    workspacePath: '~/projects/ui-components',
    messages: [
      {
        id: 'msg-s5-1',
        role: 'user',
        content: 'Create a consistent button component with variants',
        timestamp: new Date('2026-03-12T14:30:00'),
      },
    ],
    status: 'idle',
    createdAt: new Date('2026-03-12T14:30:00'),
    lastMessageAt: new Date('2026-03-12T14:30:00'),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessions: defaultSessions,
      activeSessionId: 'session-1',
      cliPrograms: defaultCliPrograms,
      settings: {
        theme: 'dark',
        accentColor: '#7c3aed',
        remoteAccess: {
          enabled: false,
          tunnelStatus: 'inactive',
          authKey: 'cjt_xK9mP2nQ8vR4sL7wY1bF6dH3jN5tU0',
          tunnelUrl: undefined,
        },
        hapticFeedback: true,
        streamingEnabled: true,
        fontSize: 'medium',
      },

      addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message],
                  lastMessageAt: message.timestamp,
                }
              : s
          ),
        })),

      updateMessage: (sessionId, messageId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
                }
              : s
          ),
        })),

      addCliProgram: (program) =>
        set((state) => ({ cliPrograms: [...state.cliPrograms, program] })),

      updateCliProgram: (id, updates) =>
        set((state) => ({
          cliPrograms: state.cliPrograms.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deleteCliProgram: (id) =>
        set((state) => ({
          cliPrograms: state.cliPrograms.filter((p) => p.id !== id),
        })),

      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

      updateRemoteAccess: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            remoteAccess: { ...state.settings.remoteAccess, ...updates },
          },
        })),
    }),
    {
      name: 'codeject-storage',
      // BACKEND INTEGRATION: Replace with server-side session persistence
    }
  )
);

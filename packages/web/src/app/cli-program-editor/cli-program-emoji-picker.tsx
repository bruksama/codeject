'use client';

const PRESET_ICONS = [
  '🤖',
  '⚡',
  '🧠',
  '▶️',
  '🔧',
  '💡',
  '🚀',
  '🛠️',
  '⚙️',
  '🔬',
  '🎯',
  '💻',
  '🌟',
  '🔮',
  '🦾',
  '🧬',
  '📦',
  '🔑',
  '🌐',
  '🎨',
  '⚗️',
  '🔩',
  '💎',
  '🏗️',
] as const;

interface CliProgramEmojiPickerProps {
  onSelect: (emoji: string) => void;
  selected: string;
}

export function CliProgramEmojiPicker({ onSelect, selected }: CliProgramEmojiPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2 p-3 sm:grid-cols-8">
      {PRESET_ICONS.map((emoji) => (
        <button
          key={emoji}
          aria-label={`Select ${emoji} icon`}
          aria-pressed={selected === emoji}
          className={`emoji-option interactive-focus-ring mobile-touch-target flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
            selected === emoji
              ? 'border border-purple-500/50 bg-purple-500/25'
              : 'border border-white/8 bg-white/4 hover:bg-white/10'
          }`}
          onClick={() => onSelect(emoji)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

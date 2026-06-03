'use client';

import type { Difficulty } from '@/types/puzzle';
import type { DifficultyUnlockState } from '@/types/game';

interface DifficultyBarProps {
  current: Difficulty;
  unlockState: DifficultyUnlockState;
  onSelect: (d: Difficulty) => void;
}

const LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const COLORS: Record<Difficulty, string> = {
  easy: 'emerald',
  medium: 'amber',
  hard: 'red',
};

const DOTS: Record<Difficulty, string> = {
  easy: '●',
  medium: '●●',
  hard: '●●●',
};

export function DifficultyBar({ current, unlockState, onSelect }: DifficultyBarProps) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-stone-800 border-b border-stone-700">
      <span className="text-xs text-stone-500 mr-2 font-medium">难度</span>
      {difficulties.map((d, i) => {
        const state = unlockState[d];
        const isActive = current === d;
        const isLocked = state === 'locked';
        const isCompleted = state === 'completed';

        return (
          <button
            key={d}
            disabled={isLocked}
            onClick={() => !isLocked && onSelect(d)}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all',
              isActive && !isLocked
                ? d === 'easy' ? 'bg-emerald-600 text-white' :
                  d === 'medium' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                : isLocked
                ? 'text-stone-600 cursor-not-allowed'
                : isCompleted
                ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-700'
                : 'text-stone-300 hover:text-white hover:bg-stone-700',
            ].join(' ')}
          >
            {isLocked && <span className="text-stone-600">🔒</span>}
            {isCompleted && !isActive && <span className="text-emerald-500">✓</span>}
            <span>{LABELS[d]}</span>
            <span className={[
              'text-[8px]',
              isActive ? 'opacity-80' : 'opacity-50',
            ].join(' ')}>
              {DOTS[d]}
            </span>
          </button>
        );
      })}

      {/* Connecting arrows */}
      <div className="flex-1" />
      <span className="text-[10px] text-stone-600">按顺序完成解锁下一难度</span>
    </div>
  );
}

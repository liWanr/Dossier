'use client';

import { useEffect, useState } from 'react';
import type { Difficulty } from '@/types/puzzle';

interface CompletionBannerProps {
  difficulty: Difficulty;
  onNext?: () => void;
  hasNext: boolean;
  // Drives the auto-advance countdown. When this number changes (set by
  // markCompleted), the banner starts a fresh countdown to the next difficulty.
  // null disables auto-advance (e.g. on already-completed revisits).
  autoAdvanceTrigger?: number | null;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const NEXT_LABEL: Partial<Record<Difficulty, string>> = {
  easy: '挑战中等难度',
  medium: '挑战困难难度',
};

const AUTO_ADVANCE_SECONDS = 8;

export function CompletionBanner({ difficulty, onNext, hasNext, autoAdvanceTrigger }: CompletionBannerProps) {
  const canAutoAdvance = hasNext && !!onNext && autoAdvanceTrigger != null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [cancelled, setCancelled] = useState(false);

  // Start / reset countdown whenever autoAdvanceTrigger changes (a new completion).
  useEffect(() => {
    if (!canAutoAdvance) { setSecondsLeft(null); return; }
    setCancelled(false);
    setSecondsLeft(AUTO_ADVANCE_SECONDS);
  }, [autoAdvanceTrigger, canAutoAdvance]);

  // Tick the countdown every second; advance when reaching zero.
  useEffect(() => {
    if (secondsLeft == null || cancelled) return;
    if (secondsLeft <= 0) {
      onNext?.();
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, cancelled, onNext]);

  const handleCancel = () => {
    setCancelled(true);
    setSecondsLeft(null);
  };

  const isCountingDown = secondsLeft != null && !cancelled && secondsLeft > 0;

  return (
    <div className="mt-3 flex items-center justify-center flex-wrap gap-x-3 gap-y-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-semibold text-emerald-700 dark:text-emerald-300">案件告破</span>
        <span className="text-stone-400 dark:text-stone-500">·</span>
        <span className="text-stone-500 dark:text-stone-300">
          今日已完成
          <span className="text-amber-600 dark:text-amber-400 font-semibold mx-1">
            {difficulty === 'hard' ? '全部' : DIFFICULTY_LABEL[difficulty]}
          </span>
          案件🎉
        </span>
      </div>
      {hasNext && onNext && (
        <div className="flex items-center gap-2">
          {isCountingDown && (
            <>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                {secondsLeft} 秒后自动
              </span>
              <button
                onClick={handleCancel}
                className="text-[11px] text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline underline-offset-2"
              >
                取消
              </button>
            </>
          )}
          <button
            onClick={onNext}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded transition-colors"
          >
            {NEXT_LABEL[difficulty]}
          </button>
        </div>
      )}
    </div>
  );
}

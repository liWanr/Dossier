'use client';

import type { Difficulty } from '@/types/puzzle';

interface CompletionBannerProps {
  difficulty: Difficulty;
  onNext?: () => void;
  hasNext: boolean;
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

export function CompletionBanner({ difficulty, onNext, hasNext }: CompletionBannerProps) {
  return (
    <div className="mt-3 flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-semibold text-emerald-700">案件告破</span>
      <span className="text-stone-400">·</span>
      <span className="text-stone-500">
        已完成
        <span className="text-amber-600 font-semibold mx-1">{DIFFICULTY_LABEL[difficulty]}</span>
        难度
      </span>
      <div className="flex-1" />
      {hasNext && onNext ? (
        <button
          onClick={onNext}
          className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded transition-colors"
        >
          {NEXT_LABEL[difficulty]}
        </button>
      ) : (
        <span className="text-emerald-600 font-semibold text-xs">🎉 今日全部案件已完成</span>
      )}
    </div>
  );
}

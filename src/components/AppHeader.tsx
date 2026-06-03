'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/types/puzzle';
import { useGameStore } from '@/lib/store/gameStore';
import { clearActiveDate } from '@/lib/time/sessionDate';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}


interface AppHeaderProps {
  activePage: 'game' | 'history';
  onShowTutorial?: () => void;
  onShowSettings?: () => void;
  isHistorical?: boolean;
}

export function AppHeader({ activePage, onShowTutorial, onShowSettings, isHistorical }: AppHeaderProps) {
  const router = useRouter();
  const { difficulty, unlockState, date, isComplete, switchDifficulty, puzzle } = useGameStore();

  const handleDotClick = (d: Difficulty) => {
    if (unlockState[d] === 'locked') return;
    switchDifficulty(d);
    if (activePage !== 'game') router.push('/');
  };

  return (
    <header className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 md:px-4 py-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 md:gap-2.5">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-black shadow">
          🔎
        </div>
        <div className="hidden sm:block">
          <div className="text-stone-900 dark:text-white font-bold text-sm leading-tight tracking-wide">侦探事务所</div>
          <div className="text-stone-500 dark:text-stone-400 text-[10px] leading-tight">每日推理挑战</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-start gap-1 text-xs">
        <div className="flex flex-col items-center gap-1">
          {activePage === 'game' ? (
            <span className="px-3 py-1.5 bg-amber-600 text-white rounded font-semibold">
              {isHistorical ? '往日案件' : '今日案件'}
            </span>
          ) : (
            <Link
              href="/"
              onClick={clearActiveDate}
              className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors"
            >
              今日案件
            </Link>
          )}
          <div className="flex items-center gap-1.5 h-3">
            {DIFFICULTIES.map(d => {
              const state = unlockState[d];
              const isActive = difficulty === d;
              const isLocked = state === 'locked';
              const isCompleted = state === 'completed';
              return (
                <button
                  key={d}
                  disabled={isLocked}
                  onClick={() => handleDotClick(d)}
                  title={d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
                  className={[
                    'rounded-full transition-all duration-150',
                    isActive ? 'w-2.5 h-2.5' : 'w-2 h-2',
                    isLocked
                      ? 'bg-stone-300 dark:bg-stone-700 cursor-not-allowed'
                      : isCompleted
                      ? 'bg-emerald-500 cursor-pointer hover:bg-emerald-400'
                      : isActive
                      ? 'bg-amber-500 cursor-pointer'
                      : 'bg-stone-400 dark:bg-stone-500 cursor-pointer hover:bg-stone-500 dark:hover:bg-stone-400',
                  ].join(' ')}
                />
              );
            })}
          </div>
        </div>

        {activePage === 'history' ? (
          <span className="px-3 py-1.5 bg-amber-600 text-white rounded font-semibold">历史记录</span>
        ) : (
          <Link
            href="/history"
            className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors"
          >
            历史记录
          </Link>
        )}
      </nav>

      {/* Right: theme badge + date + completion + settings + help */}
      <div className="flex items-center gap-2 md:gap-3 text-xs text-stone-500 dark:text-stone-400 justify-end">
        {puzzle?.themeLabel && (
          <span
            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold"
            title="今日主题：所有难度共享同一世界观"
          >
            <span aria-hidden>🎭</span>
            <span>{puzzle.themeLabel}</span>
          </span>
        )}
        {date && <span className="hidden sm:inline">{formatDate(date)}</span>}
        {isComplete && (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded">✓ 完成</span>
        )}
        {onShowSettings && (
          <button
            onClick={onShowSettings}
            title="显示设置"
            aria-label="显示设置"
            className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:border-stone-500 dark:hover:border-stone-400 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="8" cy="8" r="2.2" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {onShowTutorial && (
          <button
            onClick={onShowTutorial}
            title="游戏说明"
            className="w-6 h-6 rounded-full border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:border-stone-500 dark:hover:border-stone-400 flex items-center justify-center text-[11px] font-bold transition-colors"
          >
            ?
          </button>
        )}
      </div>
    </header>
  );
}

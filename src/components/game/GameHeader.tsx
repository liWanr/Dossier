'use client';

import Link from 'next/link';

interface GameHeaderProps {
  date: string;
  isComplete: boolean;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

export function GameHeader({ date, isComplete }: GameHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-stone-900 border-b border-stone-700 select-none">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-black shadow">
          🔎
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight tracking-wide">侦探事务所</div>
          <div className="text-stone-400 text-[10px] leading-tight">侦探事务所</div>
        </div>
      </div>

      <nav className="flex items-center gap-1 text-xs">
        <span className="px-3 py-1.5 bg-amber-600 text-white rounded font-semibold">今日案件</span>
        <Link href="/history"
          className="px-3 py-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded transition-colors">
          历史记录
        </Link>
      </nav>

      <div className="flex items-center gap-3 text-xs text-stone-400">
        <span>{formatDate(date)}</span>
        {isComplete && (
          <span className="font-semibold text-emerald-400 bg-emerald-900/40 px-2 py-1 rounded">✓ 完成</span>
        )}
      </div>
    </header>
  );
}

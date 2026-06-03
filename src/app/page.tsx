'use client';

import { useEffect, useCallback, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Difficulty, DailyPuzzles } from '@/types/puzzle';
import { useGameStore } from '@/lib/store/gameStore';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { getAllHistory, saveHistoryRecord, loadGameState, subscribeToSync } from '@/lib/db/storage';
import { getActiveDate, setActiveDate, clearActiveDate } from '@/lib/time/sessionDate';
import { AppHeader } from '@/components/AppHeader';
import { MatrixGrid } from '@/components/game/LogicMatrix/MatrixGrid';
import { MatrixGridMobile } from '@/components/game/LogicMatrix/MatrixGridMobile';
import { ClueList } from '@/components/game/CluePanel/ClueList';
import { CompletionBanner } from '@/components/game/CompletionBanner';
import { TutorialModal } from '@/components/TutorialModal';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettingsStore } from '@/lib/store/settingsStore';

function parseDateParam(param: string | null): string | null {
  if (!param || !/^\d{8}$/.test(param)) return null;
  return `${param.slice(0, 4)}-${param.slice(4, 6)}-${param.slice(6, 8)}`;
}

function getBrowserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

function GamePageInner() {
  const {
    puzzle,
    difficulty,
    date,
    matrixState,
    clueStatuses,
    isComplete,
    history,
    loadPuzzle,
    restoreMatrix,
    clickCell,
    applyHint,
    undo,
    redo,
    resetPuzzle,
    switchDifficulty,
    setHistory,
    undoStack,
    redoStack,
    hintCell,
  } = useGameStore();

  const searchParams = useSearchParams();
  const urlDate = parseDateParam(searchParams.get('date'));
  const [tz] = useState(getBrowserTz);
  const [today, setToday] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [dailyPuzzles, setDailyPuzzles] = useState<DailyPuzzles | null>(null);
  const [locked, setLocked] = useState(false);

  // Fetch puzzle data: server validates date against authoritative time + user's tz.
  // If the user is mid-session (sessionStorage has a recent "active date"), continue
  // that date even if the wall clock has crossed midnight — preserves work for night
  // owls. URL date param always wins over session lock.
  useEffect(() => {
    setDailyPuzzles(null);
    setLocked(false);
    const sessionDate = urlDate ? null : getActiveDate();
    const reqDate = urlDate ?? sessionDate ?? 'today';
    fetch(`/api/puzzle/${reqDate}?tz=${encodeURIComponent(tz)}`)
      .then(async r => {
        if (r.status === 403) {
          const data = await r.json();
          setLocked(true);
          setToday(typeof data.today === 'string' ? data.today : null);
          setTargetDate(urlDate);
          return null;
        }
        return r.json();
      })
      .then((data: (DailyPuzzles & { today?: string }) | null) => {
        if (!data) return;
        setDailyPuzzles(data);
        if (data.today) setToday(data.today);
        setTargetDate(data.date);
        // Lock this puzzle date for the session (only when not following an explicit URL date)
        if (!urlDate) setActiveDate(data.date);
      })
      .catch(console.error);
  }, [urlDate, tz]);

  // Load history once today + targetDate are known, restore appropriate difficulty
  useEffect(() => {
    if (!today || !targetDate) return;
    getAllHistory().then(h => {
      setHistory(h);
      if (targetDate !== today) {
        const rec = h[targetDate];
        let d: Difficulty = 'easy';
        if (rec?.easy && rec?.medium) d = 'hard';
        else if (rec?.easy) d = 'medium';
        switchDifficulty(d);
      } else {
        const saved = localStorage.getItem('lastDifficulty') as Difficulty | null;
        if (saved && saved !== difficulty) switchDifficulty(saved);
      }
    });
  }, [today, targetDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the selected difficulty whenever puzzles arrive or difficulty changes
  useEffect(() => {
    if (!dailyPuzzles) return;
    const p = dailyPuzzles[difficulty];
    if (!p) { console.error('No puzzle for difficulty', difficulty); return; }
    const d = dailyPuzzles.date;
    loadPuzzle(p, d);
    loadGameState(d, difficulty).then(saved => {
      if (saved) restoreMatrix(d, difficulty, saved.cells, saved.manualCells);
    }).catch(console.error);
  }, [dailyPuzzles, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab sync: when another tab writes the same (date, difficulty), reload
  // from IDB so this tab doesn't silently overwrite the other tab's progress.
  useEffect(() => {
    if (!targetDate) return;
    const unsub = subscribeToSync((msg) => {
      if (msg.kind === 'gameState' && msg.date === targetDate && msg.difficulty === difficulty) {
        loadGameState(msg.date, msg.difficulty).then(saved => {
          if (saved) restoreMatrix(msg.date, msg.difficulty, saved.cells, saved.manualCells);
        }).catch(console.error);
      } else if (msg.kind === 'history') {
        getAllHistory().then(setHistory).catch(console.error);
      }
    });
    return unsub;
  }, [targetDate, difficulty, restoreMatrix, setHistory]);

  useEffect(() => {
    if (isComplete && date && difficulty) {
      const record = history[date] ?? { date };
      saveHistoryRecord(record).catch(console.error);
    }
  }, [isComplete, date, difficulty, history]);

  const handleCellClick = useCallback(
    (catAIdx: number, itemAIdx: number, catBIdx: number, itemBIdx: number) => {
      clickCell(catAIdx, itemAIdx, catBIdx, itemBIdx);
    },
    [clickCell]
  );

  const handleDifficultySelect = useCallback(
    (d: Difficulty) => { switchDifficulty(d); },
    [switchDifficulty]
  );

  const handleNextDifficulty = useCallback(() => {
    const next: Partial<Record<Difficulty, Difficulty>> = { easy: 'medium', medium: 'hard' };
    const n = next[difficulty];
    if (n) handleDifficultySelect(n);
  }, [difficulty, handleDifficultySelect]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y (Win/Linux), Cmd+Z / Cmd+Shift+Z (Mac)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (isMac ? (key === 'z' && e.shiftKey) : key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const isHistorical = !!(today && targetDate && targetDate !== today);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const hydrateSettings = useSettingsStore(s => s.hydrate);
  useEffect(() => { hydrateSettings(); }, [hydrateSettings]);

  // Briefly pulse the "saved" indicator after each matrix change to reassure
  // the user that auto-save is alive. No action required from them.
  const [savePulse, setSavePulse] = useState(false);
  useEffect(() => {
    if (!puzzle) return;
    setSavePulse(true);
    const t = setTimeout(() => setSavePulse(false), 800);
    return () => clearTimeout(t);
  }, [matrixState, puzzle]);

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/mac/i.test(navigator.platform));
  }, []);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const [pinnedTerm, setPinnedTerm] = useState<string | null>(null);
  const activeTerm = pinnedTerm ?? hoveredTerm;

  const allTerms = puzzle
    ? puzzle.categories.flatMap(cat => cat.items.map(item => item.name))
    : [];

  const handleTermClick = useCallback((term: string) => {
    setPinnedTerm(prev => (prev === term ? null : term));
  }, []);

  const hasNextDifficulty = difficulty !== 'hard';
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'matrix' | 'clues'>('matrix');

  // Clue counts for the segmented control badge
  const satisfiedClues = puzzle ? puzzle.clues.filter(c => clueStatuses[c.id] === 'satisfied').length : 0;
  const violatedClues  = puzzle ? puzzle.clues.filter(c => clueStatuses[c.id] === 'violated').length : 0;
  const totalClues     = puzzle?.clues.length ?? 0;

  // Surface freshly-applied hints by jumping to the relevant view
  useEffect(() => {
    if (hintCell?.clueId) setMobileView('matrix');
  }, [hintCell]);

  if (locked) {
    return (
      <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
        <TutorialModal forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
        <AppHeader activePage="game" onShowTutorial={() => setShowTutorial(true)} onShowSettings={() => setShowSettings(true)} isHistorical={false} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-stone-200 p-10 text-center max-w-md w-full">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-lg font-bold text-stone-700 mb-2">案件尚未解锁</h2>
            <p className="text-sm text-stone-500 mb-1">
              {targetDate && <>所选日期 <span className="font-semibold text-stone-700">{targetDate}</span> 还未到来。</>}
            </p>
            <p className="text-xs text-stone-400 mb-6">
              {today ? <>当前日期（{tz}）：{today}</> : '正在校时…'}
            </p>
            <Link
              href="/"
              onClick={clearActiveDate}
              className="inline-block px-4 py-2 rounded-md bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              返回今日案件
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
      <TutorialModal forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <AppHeader activePage="game" onShowTutorial={() => setShowTutorial(true)} onShowSettings={() => setShowSettings(true)} isHistorical={isHistorical} />

      {/* Mobile-only segmented view switcher — matrix and clues each get full screen */}
      {isMobile && puzzle && (
        <div className="flex gap-1 px-2 py-1.5 bg-stone-200/70 border-b border-stone-200">
          <button
            onClick={() => setMobileView('matrix')}
            className={[
              'flex-1 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
              mobileView === 'matrix' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500',
            ].join(' ')}
          >
            <span aria-hidden>🎯</span>
            <span>矩阵</span>
          </button>
          <button
            onClick={() => setMobileView('clues')}
            className={[
              'flex-1 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
              mobileView === 'clues' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500',
            ].join(' ')}
          >
            <span aria-hidden>📝</span>
            <span>线索</span>
            <span className={[
              'text-[10px] tabular-nums rounded-full px-1.5 py-px',
              violatedClues > 0
                ? 'bg-red-100 text-red-600'
                : mobileView === 'clues' ? 'bg-stone-100 text-stone-500' : 'bg-stone-300/60 text-stone-600',
            ].join(' ')}>
              {violatedClues > 0 ? `${violatedClues}⚠` : `${satisfiedClues}/${totalClues}`}
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        {/* Matrix area: desktop right(70%) / mobile full-screen via view switcher.
            min-h-0 on flex children stops them from being pushed past their share
            by their own content, so overflow-auto inside actually scrolls. */}
        <div className={[
          'flex-1 min-h-0 md:flex-[7] flex flex-col overflow-hidden bg-stone-50 md:border-r border-stone-200',
          isMobile && mobileView !== 'matrix' ? 'hidden' : '',
        ].join(' ')}>
          {puzzle && (
            <div className="px-2 md:px-4 min-h-10 py-1.5 md:py-0 md:h-10 border-b border-stone-200 flex flex-wrap items-center justify-between gap-y-1 bg-white">
              <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs flex-wrap">
                <span className="flex items-center gap-1 md:gap-1.5 bg-stone-50 text-stone-500 rounded-full px-2 md:px-2.5 py-0.5 md:py-1 font-medium border border-stone-200">
                  <span className="text-red-500">✕</span><span>排除</span>
                  <span className="text-stone-300 mx-0.5">→</span>
                  <span className="text-emerald-600">✓</span><span>确认</span>
                  <span className="text-stone-300 mx-0.5">→</span>
                  <span>○</span><span>清除</span>
                </span>
                {!isComplete && (
                  <>
                    <span className="text-stone-300 hidden md:inline">·</span>
                    <button
                      onClick={undo}
                      disabled={undoStack.length === 0}
                      className="flex items-center gap-1 bg-stone-100 text-stone-500 rounded-full px-2 md:px-2.5 py-0.5 md:py-1 font-medium hover:bg-stone-200 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ↩<span className="hidden md:inline"> {isMac ? '⌘+Z' : 'Ctrl+Z'}</span> 撤回
                    </button>
                    <button
                      onClick={redo}
                      disabled={redoStack.length === 0}
                      className="flex items-center gap-1 bg-stone-100 text-stone-500 rounded-full px-2 md:px-2.5 py-0.5 md:py-1 font-medium hover:bg-stone-200 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ↪<span className="hidden md:inline"> {isMac ? '⌘+⇧+Z' : 'Ctrl+Y'}</span> 重做
                    </button>
                  </>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-1">
                {!isComplete && (
                  <span
                    className={[
                      'flex items-center gap-1 text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 rounded transition-colors',
                      savePulse ? 'text-emerald-700 bg-emerald-50' : 'text-stone-400',
                    ].join(' ')}
                    title="所有进度均实时保存到本机浏览器"
                  >
                    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M3 7.5l3.5 3.5L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden md:inline">已实时存至本地</span>
                  </span>
                )}
                {!isComplete && (
                  <button
                    onClick={applyHint}
                    className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                  >
                    提示
                  </button>
                )}
                <button
                  onClick={resetPuzzle}
                  className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100 transition-colors"
                >
                  重置
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-3 md:p-6">
            {/* Inner wrapper centers content when it fits, scrolls naturally when it doesn't —
                avoids justify-center clipping the CompletionBanner on short viewports. */}
            <div className="min-h-full flex flex-col items-center justify-center gap-3">
              {puzzle ? (
                <>
                  {isMobile ? (
                    <MatrixGridMobile
                      puzzle={puzzle}
                      matrixState={matrixState}
                      onCellClick={handleCellClick}
                      onHoverTerm={setHoveredTerm}
                      onClickTerm={handleTermClick}
                      disabled={isComplete}
                      hintCell={hintCell}
                    />
                  ) : (
                    <MatrixGrid
                      puzzle={puzzle}
                      matrixState={matrixState}
                      onCellClick={handleCellClick}
                      onHoverTerm={setHoveredTerm}
                      onClickTerm={handleTermClick}
                      disabled={isComplete}
                      hintCell={hintCell}
                    />
                  )}
                  {isComplete && (
                    <div className="w-full max-w-md">
                      <CompletionBanner
                        difficulty={difficulty}
                        onNext={handleNextDifficulty}
                        hasNext={hasNextDifficulty}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-stone-400 text-sm animate-pulse">载入案件中…</div>
              )}
            </div>
          </div>

        </div>

        {/* Clue Panel: desktop right(30%) / mobile full-screen via view switcher */}
        <div className={[
          'flex-1 min-h-0 md:flex-[3] flex flex-col overflow-hidden bg-white',
          isMobile && mobileView !== 'clues' ? 'hidden' : '',
        ].join(' ')}>
          {puzzle ? (
            <ClueList
              puzzle={puzzle}
              clueStatuses={clueStatuses}
              activeTerm={activeTerm}
              allTerms={allTerms}
              onHoverTerm={setHoveredTerm}
              onClickTerm={handleTermClick}
              hintClueId={hintCell?.clueId ?? null}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-stone-300 text-sm">
              等待案件加载…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense>
      <GamePageInner />
    </Suspense>
  );
}

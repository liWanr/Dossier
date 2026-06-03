'use client';

import { useEffect, useState } from 'react';
import type { Puzzle } from '@/types/puzzle';
import type { MatrixState } from '@/types/game';
import type { HintResult } from '@/lib/engine/hint';
import { getCellState, makeCellKey } from '@/lib/engine/matrixUtils';
import { MatrixCell } from './MatrixCell';

interface MatrixGridMobileProps {
  puzzle: Puzzle;
  matrixState: MatrixState;
  onCellClick: (catAIdx: number, itemAIdx: number, catBIdx: number, itemBIdx: number) => void;
  onHoverTerm?: (term: string | null) => void;
  onClickTerm?: (term: string) => void;
  disabled?: boolean;
  hintCell?: HintResult | null;
}

// Mobile presentation: one N×N (primary × secondary) subgrid at a time, switched
// via a tab strip at the top. Each subgrid is small enough to fit any phone
// portrait, while the tab strip keeps the global mental model.
export function MatrixGridMobile({
  puzzle, matrixState, onCellClick, onClickTerm, disabled, hintCell,
}: MatrixGridMobileProps) {
  const { categories } = puzzle;
  const primaryCat  = categories[0];
  const secondaries = categories.slice(1);

  const [activeTab, setActiveTab] = useState(0);

  // Auto-jump tab to the one containing the hint cell so the user instantly
  // sees the highlighted cell after pressing 提示.
  useEffect(() => {
    if (!hintCell) return;
    const idx = hintCell.catBIdx - 1; // secondaries are categories[1..]
    if (idx >= 0 && idx < secondaries.length) setActiveTab(idx);
  }, [hintCell, secondaries.length]);

  const n = primaryCat.items.length;
  // Tap-target floor: 44px (Apple HIG, Material Design). On hard mode (n=6) the
  // resulting table is wider than ~360px viewports — accept horizontal scroll
  // inside the table card. Height also stays generous so the table fills the
  // matrix area visually instead of looking small relative to the page.
  const CELL_W  = n >= 6 ? 44 : n === 5 ? 48 : 54;
  const CELL_H  = n >= 6 ? 56 : n === 5 ? 60 : 64;
  const LABEL_W = n >= 6 ? 56 : 64;

  const currentCat = secondaries[activeTab];
  const catIdx     = activeTab + 1;

  // Per-tab progress (how many primary items have a confirmed assignment in this subgrid)
  const tabProgress = (gi: number) => {
    const cIdx = gi + 1;
    const cat  = secondaries[gi];
    let done = 0;
    for (let di = 0; di < n; di++) {
      for (let ii = 0; ii < cat.items.length; ii++) {
        if (getCellState(matrixState, 0, di, cIdx, ii) === 'confirmed') { done++; break; }
      }
    }
    return done;
  };

  return (
    /* Fills the matrix area's full height on mobile (parent gives `flex-1`).
       Tabs stretch vertically via `justify-around` to soak up empty space;
       table stays centered both axes. */
    <div className="w-full h-full flex items-center gap-2">
      {/* Left tab column — stretches to full height, evenly distributes its buttons */}
      <div className="self-stretch flex flex-col justify-around shrink-0 py-2">
        {secondaries.map((cat, gi) => {
          const isActive = gi === activeTab;
          const done = tabProgress(gi);
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(gi)}
              className={[
                'flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors min-w-[44px]',
                isActive
                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700',
              ].join(' ')}
            >
              <span className="text-sm leading-none" aria-hidden>{cat.icon}</span>
              <span className="leading-tight">{cat.name}</span>
              <span className={[
                'text-[9px] tabular-nums rounded px-1',
                isActive ? 'bg-amber-700/40 text-amber-50' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300',
              ].join(' ')}>
                {done}/{n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table area — `overflow-x-auto` lets the wider hard-mode table scroll
          horizontally instead of squashing cells below the 44px tap-target floor. */}
      <div className="flex-1 min-w-0 flex justify-center">
      <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-stone-200 dark:ring-stone-700 bg-white dark:bg-stone-900 max-w-full">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="border-collapse select-none text-[11px]">
          <thead>
            <tr className="border-b-2 border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
              <th style={{ width: LABEL_W, height: 56 }} className="text-[10px] text-stone-400 dark:text-stone-500 px-2 align-bottom pb-1.5">
                <div className="text-left leading-tight">
                  ↓ {primaryCat.name}<br />
                  <span className="text-stone-400 dark:text-stone-500">/ {currentCat.name} →</span>
                </div>
              </th>
              {currentCat.items.map(item => (
                <th
                  key={item.id}
                  className="align-bottom pb-2 font-normal cursor-default select-none"
                  style={{ width: CELL_W, height: 56 }}
                  onClick={() => onClickTerm?.(item.name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span
                      className="text-stone-500 dark:text-stone-400 text-[11px]"
                      style={{ writingMode: 'vertical-lr', textAlign: 'center' }}
                    >
                      {item.name.split(/(\d+)/).map((part, i) =>
                        /^\d+$/.test(part)
                          ? <span key={i} style={{ textCombineUpright: 'all' }}>{part}</span>
                          : part
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {primaryCat.items.map((primary, di) => {
              const isLastRow = di === primaryCat.items.length - 1;
              return (
                <tr
                  key={primary.id}
                  className={[
                    di % 2 === 1 ? 'bg-stone-50/60 dark:bg-stone-800/60' : 'bg-white dark:bg-stone-900',
                    !isLastRow ? 'border-b border-stone-100 dark:border-stone-800' : '',
                  ].join(' ')}
                >
                  <td
                    className="text-right pr-2 text-stone-600 dark:text-stone-300 font-medium whitespace-nowrap border-r-2 border-stone-200 dark:border-stone-700 cursor-default select-none text-[11px]"
                    style={{ height: CELL_H }}
                    onClick={() => onClickTerm?.(primary.name)}
                  >
                    {primary.name}
                  </td>
                  {currentCat.items.map((item, ii) => {
                    const state    = getCellState(matrixState, 0, di, catIdx, ii);
                    const isManual = !!matrixState.manualCells[makeCellKey(0, di, catIdx, ii)];
                    const isAuto   = state !== 'unknown' && !isManual;
                    const isHinted = !!(
                      hintCell &&
                      makeCellKey(0, di, catIdx, ii) === makeCellKey(hintCell.catAIdx, hintCell.itemAIdx, hintCell.catBIdx, hintCell.itemBIdx)
                    );
                    return (
                      <td key={item.id} className="p-0">
                        <MatrixCell
                          state={state}
                          isManual={isManual}
                          isAuto={isAuto}
                          disabled={disabled || isAuto}
                          size={CELL_W}
                          height={CELL_H}
                          isHinted={isHinted}
                          onClick={() => onCellClick(0, di, catIdx, ii)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
      </div>
    </div>
  );
}

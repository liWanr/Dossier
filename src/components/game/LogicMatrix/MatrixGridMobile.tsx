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
  // Cell sizes so 6 cells + label fit on a 320px phone
  const CELL    = n >= 6 ? 38 : n === 5 ? 44 : 50;
  const LABEL_W = n >= 6 ? 62 : 72;

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
    <div className="w-full flex flex-col items-center gap-3">
      {/* Tab strip — horizontal row above the table so the table below stays
          at true horizontal center of its container. */}
      <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 -mx-1 px-1 snap-x">
        {secondaries.map((cat, gi) => {
          const isActive = gi === activeTab;
          const done = tabProgress(gi);
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(gi)}
              className={[
                'shrink-0 snap-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50',
              ].join(' ')}
            >
              <span aria-hidden>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className={[
                'text-[10px] tabular-nums rounded px-1.5 py-px',
                isActive ? 'bg-amber-700/40 text-amber-50' : 'bg-stone-100 text-stone-500',
              ].join(' ')}>
                {done}/{n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active subgrid — explicit flex/justify-center wrapper guarantees
          horizontal centering of the table card regardless of intrinsic sizing. */}
      <div className="w-full flex justify-center">
      <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-stone-200 bg-white">
        <table className="border-collapse select-none text-[11px]">
          <thead>
            <tr className="border-b-2 border-stone-200 bg-stone-50">
              <th style={{ width: LABEL_W, height: 56 }} className="text-[10px] text-stone-400 px-2 align-bottom pb-1.5">
                <div className="text-left leading-tight">
                  ↓ {primaryCat.name}<br />
                  <span className="text-stone-400">/ {currentCat.name} →</span>
                </div>
              </th>
              {currentCat.items.map(item => (
                <th
                  key={item.id}
                  className="align-bottom pb-2 font-normal cursor-default select-none"
                  style={{ width: CELL, height: 56 }}
                  onClick={() => onClickTerm?.(item.name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span
                      className="text-stone-500 text-[11px]"
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
                    di % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
                    !isLastRow ? 'border-b border-stone-100' : '',
                  ].join(' ')}
                >
                  <td
                    className="text-right pr-2 text-stone-600 font-medium whitespace-nowrap border-r-2 border-stone-200 cursor-default select-none text-[11px]"
                    style={{ height: CELL }}
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
                          size={CELL}
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
  );
}

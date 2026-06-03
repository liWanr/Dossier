'use client';

import type { Puzzle } from '@/types/puzzle';
import type { MatrixState } from '@/types/game';
import type { HintResult } from '@/lib/engine/hint';
import { getCellState, makeCellKey } from '@/lib/engine/matrixUtils';
import { MatrixCell } from './MatrixCell';

interface MatrixGridProps {
  puzzle: Puzzle;
  matrixState: MatrixState;
  onCellClick: (catAIdx: number, itemAIdx: number, catBIdx: number, itemBIdx: number) => void;
  onHoverTerm?: (term: string | null) => void;
  onClickTerm?: (term: string) => void;
  disabled?: boolean;
  hintCell?: HintResult | null;
}

export function MatrixGrid({ puzzle, matrixState, onCellClick, onHoverTerm, onClickTerm, disabled, hintCell }: MatrixGridProps) {
  const { categories } = puzzle;
  const primaryCat = categories[0];
  const colCats    = categories.slice(1);

  const totalCols = colCats.reduce((sum, cat) => sum + cat.items.length, 0);
  const CELL     = totalCols > 24 ? 28 : totalCols > 15 ? 30 : 36;
  const LABEL_W  = totalCols > 24 ? 52 : totalCols > 15 ? 56 : 64;
  const HEADER_H = totalCols > 24 ? 64 : totalCols > 15 ? 66 : 72;

  return (
    <div className="inline-block rounded-xl overflow-hidden shadow-sm ring-1 ring-stone-200 bg-white">
      <table className="border-collapse select-none text-[11px]">
        <thead>
          {/* Category group headers */}
          <tr className="bg-stone-50">
            <th rowSpan={2} style={{ width: LABEL_W }} />
            {colCats.map((cat, gi) => (
              <th
                key={cat.id}
                colSpan={cat.items.length}
                className={[
                  'text-center text-[11px] font-semibold text-stone-400 tracking-wide uppercase py-1.5',
                  gi > 0 ? 'border-l-2 border-stone-200' : '',
                ].join(' ')}
              >
                {cat.name}
              </th>
            ))}
          </tr>

          {/* Item name headers */}
          <tr className="border-b-2 border-stone-200">
            {colCats.map((cat, gi) =>
              cat.items.map((item, ii) => (
                <th
                  key={item.id}
                  className={[
                    'bg-white align-bottom pb-2 font-normal cursor-default select-none',
                    ii === 0 && gi > 0 ? 'border-l-2 border-stone-200' : '',
                  ].join(' ')}
                  style={{ width: CELL, height: HEADER_H }}
                  onMouseEnter={() => onHoverTerm?.(item.name)}
                  onMouseLeave={() => onHoverTerm?.(null)}
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
              ))
            )}
          </tr>
        </thead>

        <tbody>
          {primaryCat.items.map((detective, di) => {
            const isLast = di === primaryCat.items.length - 1;
            return (
              <tr
                key={detective.id}
                className={[
                  di % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
                  !isLast ? 'border-b border-stone-100' : '',
                ].join(' ')}
              >
                <td
                  className="text-right pr-3 text-stone-600 font-medium whitespace-nowrap border-r-2 border-stone-200 cursor-default select-none"
                  style={{ height: CELL }}
                  onMouseEnter={() => onHoverTerm?.(detective.name)}
                  onMouseLeave={() => onHoverTerm?.(null)}
                  onClick={() => onClickTerm?.(detective.name)}
                >
                  {detective.name}
                </td>

                {colCats.map((cat, gi) => {
                  const catIdx = gi + 1;
                  return cat.items.map((item, ii) => {
                    const state    = getCellState(matrixState, 0, di, catIdx, ii);
                    const isManual = !!matrixState.manualCells[makeCellKey(0, di, catIdx, ii)];
                    const isAuto   = state !== 'unknown' && !isManual;
                    const isHinted = !!(
                      hintCell &&
                      makeCellKey(0, di, catIdx, ii) === makeCellKey(hintCell.catAIdx, hintCell.itemAIdx, hintCell.catBIdx, hintCell.itemBIdx)
                    );
                    return (
                      <td
                        key={item.id}
                        className={[
                          'p-0',
                          ii === 0 && gi > 0 ? 'border-l-2 border-stone-200' : '',
                        ].join(' ')}
                      >
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
                  });
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

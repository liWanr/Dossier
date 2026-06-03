'use client';

import type { Category } from '@/types/puzzle';
import type { MatrixState } from '@/types/game';
import { getCellState, makeCellKey } from '@/lib/engine/matrixUtils';
import { MatrixCell } from './MatrixCell';

interface SubMatrixProps {
  rowCat: Category;
  rowCatIdx: number;
  colCat: Category;
  colCatIdx: number;
  matrixState: MatrixState;
  onCellClick: (catAIdx: number, itemAIdx: number, catBIdx: number, itemBIdx: number) => void;
  disabled?: boolean;
}

export function SubMatrix({
  rowCat, rowCatIdx,
  colCat, colCatIdx,
  matrixState,
  onCellClick,
  disabled,
}: SubMatrixProps) {
  return (
    <div className="border border-stone-400 inline-grid"
      style={{ gridTemplateColumns: `repeat(${colCat.items.length}, 2rem)` }}
    >
      {rowCat.items.map((rowItem, ri) =>
        colCat.items.map((colItem, ci) => {
          const state = getCellState(matrixState, rowCatIdx, ri, colCatIdx, ci);
          return (
            <MatrixCell
              key={`${ri}-${ci}`}
              state={state}
              disabled={disabled}
              onClick={() => onCellClick(rowCatIdx, ri, colCatIdx, ci)}
            />
          );
        })
      )}
    </div>
  );
}

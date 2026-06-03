import type { Puzzle, Category } from '@/types/puzzle';
import type { CellKey, CellState, MatrixState } from '@/types/game';

// Returns canonical cell key, always with lower cat/item index first
export function makeCellKey(
  catAIdx: number, itemAIdx: number,
  catBIdx: number, itemBIdx: number
): CellKey {
  if (catAIdx < catBIdx) {
    return `${catAIdx}:${itemAIdx}||${catBIdx}:${itemBIdx}`;
  }
  return `${catBIdx}:${itemBIdx}||${catAIdx}:${itemAIdx}`;
}

export function parseCellKey(key: CellKey): [number, number, number, number] {
  const [left, right] = key.split('||');
  const [catA, itemA] = left.split(':').map(Number);
  const [catB, itemB] = right.split(':').map(Number);
  return [catA, itemA, catB, itemB];
}

// Get cell state, always normalizing key direction
export function getCellState(
  matrix: MatrixState,
  catAIdx: number, itemAIdx: number,
  catBIdx: number, itemBIdx: number
): CellState {
  const key = makeCellKey(catAIdx, itemAIdx, catBIdx, itemBIdx);
  return matrix.cells[key] ?? 'unknown';
}

// Build index maps for quick lookup
export function buildCategoryIndex(categories: Category[]) {
  const catIdToIdx: Record<string, number> = {};
  const itemIdToIdx: Record<string, number> = {};
  const catItemToIdx: Record<string, Record<string, number>> = {};

  categories.forEach((cat, ci) => {
    catIdToIdx[cat.id] = ci;
    catItemToIdx[cat.id] = {};
    cat.items.forEach((item, ii) => {
      itemIdToIdx[item.id] = ii;
      catItemToIdx[cat.id][item.id] = ii;
    });
  });

  return { catIdToIdx, itemIdToIdx, catItemToIdx };
}

// Initialize empty matrix state
export function initMatrixState(_puzzle: Puzzle): MatrixState {
  return { cells: {}, manualCells: {} };
}

// Build a fully-solved matrix from the puzzle solution (used when displaying a completed puzzle).
// Returns an empty matrix if solution is not available (e.g., on client where solution is stripped).
export function buildSolutionMatrix(puzzle: Puzzle): MatrixState {
  const { categories, solution } = puzzle;
  if (!solution) return { cells: {}, manualCells: {} };
  const primaryCatIdx = categories.findIndex(c => c.id === solution.primaryCategoryId);
  if (primaryCatIdx === -1) return { cells: {}, manualCells: {} };

  const cells: Record<CellKey, CellState> = {};
  const worklist: [number, number, number, number][] = [];

  for (const [primaryItemId, assignments] of Object.entries(solution.assignments)) {
    const primaryItemIdx = categories[primaryCatIdx].items.findIndex(i => i.id === primaryItemId);
    if (primaryItemIdx === -1) continue;
    for (const [catId, itemId] of Object.entries(assignments)) {
      const catIdx = categories.findIndex(c => c.id === catId);
      if (catIdx === -1) continue;
      const itemIdx = categories[catIdx].items.findIndex(i => i.id === itemId);
      if (itemIdx === -1) continue;
      const key = makeCellKey(primaryCatIdx, primaryItemIdx, catIdx, itemIdx);
      cells[key] = 'confirmed';
      worklist.push([primaryCatIdx, primaryItemIdx, catIdx, itemIdx]);
    }
  }

  runBFS(cells, puzzle, worklist);
  return { cells, manualCells: {} };
}

// Run BFS propagation from a seed of confirmed pairs onto a mutable cells dict.
// Returns the same cells dict (mutated in place) for convenience.
function runBFS(
  cells: Record<CellKey, CellState>,
  puzzle: Puzzle,
  worklist: [number, number, number, number][]
): Record<CellKey, CellState> {
  const n = puzzle.categories.length;
  const size = (ci: number) => puzzle.categories[ci].items.length;

  function setCell(cA: number, iA: number, cB: number, iB: number, state: CellState) {
    const key = makeCellKey(cA, iA, cB, iB);
    if (cells[key] === state) return;
    cells[key] = state;
    if (state === 'confirmed') worklist.push([cA, iA, cB, iB]);
  }

  while (worklist.length > 0) {
    const [cA, iA, cB, iB] = worklist.shift()!;

    // 1. Exclude all other items in catB for this catA item
    for (let j = 0; j < size(cB); j++) {
      if (j === iB) continue;
      const key = makeCellKey(cA, iA, cB, j);
      if ((cells[key] ?? 'unknown') === 'unknown') {
        cells[key] = 'excluded';
        const rem: number[] = [];
        for (let jj = 0; jj < size(cB); jj++) {
          if ((cells[makeCellKey(cA, iA, cB, jj)] ?? 'unknown') !== 'excluded') rem.push(jj);
        }
        if (rem.length === 1) setCell(cA, iA, cB, rem[0], 'confirmed');
      }
    }

    // 2. Exclude all other items in catA for this catB item
    for (let i = 0; i < size(cA); i++) {
      if (i === iA) continue;
      const key = makeCellKey(cA, i, cB, iB);
      if ((cells[key] ?? 'unknown') === 'unknown') {
        cells[key] = 'excluded';
        const rem: number[] = [];
        for (let ii = 0; ii < size(cA); ii++) {
          if ((cells[makeCellKey(cA, ii, cB, iB)] ?? 'unknown') !== 'excluded') rem.push(ii);
        }
        if (rem.length === 1) setCell(cA, rem[0], cB, iB, 'confirmed');
      }
    }

    // 3. Bidirectional transitive propagation
    for (let cC = 0; cC < n; cC++) {
      if (cC === cA || cC === cB) continue;
      for (let iC = 0; iC < size(cC); iC++) {
        const acKey = makeCellKey(cA, iA, cC, iC);
        const bcKey = makeCellKey(cB, iB, cC, iC);

        if (cells[acKey] === 'confirmed' && (cells[bcKey] ?? 'unknown') !== 'confirmed') {
          setCell(cB, iB, cC, iC, 'confirmed');
        }
        if (cells[bcKey] === 'confirmed' && (cells[acKey] ?? 'unknown') !== 'confirmed') {
          setCell(cA, iA, cC, iC, 'confirmed');
        }

        if (cells[acKey] === 'excluded' && (cells[bcKey] ?? 'unknown') === 'unknown') {
          cells[bcKey] = 'excluded';
          const rem: number[] = [];
          for (let jj = 0; jj < size(cC); jj++) {
            if ((cells[makeCellKey(cB, iB, cC, jj)] ?? 'unknown') !== 'excluded') rem.push(jj);
          }
          if (rem.length === 1) setCell(cB, iB, cC, rem[0], 'confirmed');
        }
        if (cells[bcKey] === 'excluded' && (cells[acKey] ?? 'unknown') === 'unknown') {
          cells[acKey] = 'excluded';
          const rem: number[] = [];
          for (let jj = 0; jj < size(cC); jj++) {
            if ((cells[makeCellKey(cA, iA, cC, jj)] ?? 'unknown') !== 'excluded') rem.push(jj);
          }
          if (rem.length === 1) setCell(cA, iA, cC, rem[0], 'confirmed');
        }
      }
    }
  }

  return cells;
}

// Rebuild derived state from scratch using only manual cells.
// Called when a cell is cleared (state → unknown) to undo propagation.
function recomputeFromManual(
  manual: Record<CellKey, CellState>,
  puzzle: Puzzle
): MatrixState {
  const cells: Record<CellKey, CellState> = {};
  const worklist: [number, number, number, number][] = [];

  for (const [key, state] of Object.entries(manual)) {
    cells[key] = state;
    if (state === 'confirmed') worklist.push(parseCellKey(key as CellKey));
    // Exclusions are recorded as-is, no auto-propagation.
  }

  runBFS(cells, puzzle, worklist);
  return { cells, manualCells: { ...manual } };
}

// Apply a cell state change and run full constraint propagation via BFS worklist
export function applyAndPropagate(
  matrix: MatrixState,
  puzzle: Puzzle,
  catAIdx: number,
  itemAIdx: number,
  catBIdx: number,
  itemBIdx: number,
  newState: CellState
): MatrixState {
  const initKey = makeCellKey(catAIdx, itemAIdx, catBIdx, itemBIdx);

  // Update manual cell registry
  const newManual: Record<CellKey, CellState> = { ...matrix.manualCells };
  if (newState === 'unknown') {
    delete newManual[initKey];
    return recomputeFromManual(newManual, puzzle);
  }
  newManual[initKey] = newState;

  const cells = { ...matrix.cells };
  const worklist: [number, number, number, number][] = [];

  cells[initKey] = newState;
  if (newState === 'confirmed') {
    worklist.push([catAIdx, itemAIdx, catBIdx, itemBIdx]);
  }
  // Excluded: just record the cell, no propagation.

  runBFS(cells, puzzle, worklist);
  return { cells, manualCells: newManual };
}

// Toggle cell state: unknown → excluded → confirmed → unknown
export function toggleCellState(current: CellState): CellState {
  if (current === 'unknown') return 'excluded';
  if (current === 'excluded') return 'confirmed';
  return 'unknown';
}

// Check if the puzzle is fully solved: every primary item has exactly one confirmed
// assignment per other category (bijective completion), regardless of which solution
// the player found.
export function checkCompletion(matrix: MatrixState, puzzle: Puzzle): boolean {
  const { categories } = puzzle;
  const primaryCatId = puzzle.primaryCategoryId ?? puzzle.solution?.primaryCategoryId;
  if (!primaryCatId) return false;
  const primaryCatIdx = categories.findIndex(c => c.id === primaryCatId);
  if (primaryCatIdx === -1) return false;

  const n = categories[primaryCatIdx].items.length;
  for (let di = 0; di < n; di++) {
    for (let ci = 0; ci < categories.length; ci++) {
      if (ci === primaryCatIdx) continue;
      let confirmed = 0;
      for (let ii = 0; ii < categories[ci].items.length; ii++) {
        if (getCellState(matrix, primaryCatIdx, di, ci, ii) === 'confirmed') confirmed++;
      }
      if (confirmed !== 1) return false;
    }
  }
  return true;
}

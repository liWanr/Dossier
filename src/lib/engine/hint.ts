import type { Puzzle } from '@/types/puzzle';
import type { MatrixState, ClueStatus } from '@/types/game';
import { getCellState, buildCategoryIndex, buildSolutionMatrix } from './matrixUtils';

export interface HintResult {
  catAIdx: number;
  itemAIdx: number;
  catBIdx: number;
  itemBIdx: number;
  state: 'confirmed' | 'excluded';
  clueId?: string;
  clueText?: string;
}

export function computeHint(
  matrix: MatrixState,
  puzzle: Puzzle,
  clueStatuses: Record<string, ClueStatus>
): HintResult | null {
  const { categories, clues, solution } = puzzle;
  if (!solution) return null; // hint only works server-side where solution is available
  const { catItemToIdx } = buildCategoryIndex(categories);

  const primaryCatIdx = categories.findIndex(c => c.id === solution.primaryCategoryId);
  if (primaryCatIdx === -1) return null;
  const primaryCatId = solution.primaryCategoryId;

  // Step 1: find an unverified direct clue whose target cell is in the grid
  // (grid only shows primary-category × other-category pairs)
  for (const clue of clues) {
    if (clueStatuses[clue.id] !== 'unverified') continue;
    if (clue.type !== 'direct_positive' && clue.type !== 'direct_negative') continue;

    // Skip clues that don't involve the primary category — those cells aren't in the grid
    const involvesPrimary =
      clue.params.categoryA === primaryCatId || clue.params.categoryB === primaryCatId;
    if (!involvesPrimary) continue;

    const catAIdx = categories.findIndex(c => c.id === clue.params.categoryA);
    const catBIdx = categories.findIndex(c => c.id === clue.params.categoryB);
    const itemAIdx = catItemToIdx[clue.params.categoryA]?.[clue.params.itemA];
    const itemBIdx = catItemToIdx[clue.params.categoryB]?.[clue.params.itemB];

    if (catAIdx === -1 || catBIdx === -1 || itemAIdx === undefined || itemBIdx === undefined) continue;
    if (getCellState(matrix, catAIdx, itemAIdx, catBIdx, itemBIdx) !== 'unknown') continue;

    return {
      catAIdx, itemAIdx, catBIdx, itemBIdx,
      state: clue.type === 'direct_positive' ? 'confirmed' : 'excluded',
      clueId: clue.id,
      clueText: clue.text,
    };
  }

  // Step 2: fallback — reveal a random unknown cell from the solution,
  // restricted to primary × other pairs (the only cells shown in the grid)
  const solutionMatrix = buildSolutionMatrix(puzzle);
  const toConfirm: HintResult[] = [];
  const toExclude: HintResult[] = [];

  for (let di = 0; di < categories[primaryCatIdx].items.length; di++) {
    for (let ci = 0; ci < categories.length; ci++) {
      if (ci === primaryCatIdx) continue;
      for (let ii = 0; ii < categories[ci].items.length; ii++) {
        if (getCellState(matrix, primaryCatIdx, di, ci, ii) !== 'unknown') continue;
        const sol = getCellState(solutionMatrix, primaryCatIdx, di, ci, ii);
        if (sol === 'confirmed') {
          toConfirm.push({ catAIdx: primaryCatIdx, itemAIdx: di, catBIdx: ci, itemBIdx: ii, state: 'confirmed' });
        } else if (sol === 'excluded') {
          toExclude.push({ catAIdx: primaryCatIdx, itemAIdx: di, catBIdx: ci, itemBIdx: ii, state: 'excluded' });
        }
      }
    }
  }

  const pool = toConfirm.length > 0 ? toConfirm : toExclude;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

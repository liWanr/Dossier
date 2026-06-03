import type { Puzzle, Clue } from '@/types/puzzle';
import type { MatrixState, ClueStatus } from '@/types/game';
import { getCellState, buildCategoryIndex } from './matrixUtils';

export function validateClue(
  clue: Clue,
  matrix: MatrixState,
  puzzle: Puzzle
): ClueStatus {
  const { categories } = puzzle;
  const { catItemToIdx } = buildCategoryIndex(categories);

  const catAIdx = categories.findIndex(c => c.id === clue.params.categoryA);
  const catBIdx = categories.findIndex(c => c.id === clue.params.categoryB);
  if (catAIdx === -1 || catBIdx === -1) return 'unverified';

  const itemAIdx = catItemToIdx[clue.params.categoryA]?.[clue.params.itemA];

  // category_range uses validItems instead of itemB, so handle before itemBIdx check
  if (clue.type === 'category_range') {
    if (itemAIdx === undefined) return 'unverified';
    const validItems = clue.params.validItems ?? [];
    for (const vid of validItems) {
      const vIdx = catItemToIdx[clue.params.categoryB]?.[vid];
      if (vIdx === undefined) continue;
      if (getCellState(matrix, catAIdx, itemAIdx, catBIdx, vIdx) === 'confirmed') return 'satisfied';
    }
    for (let j = 0; j < categories[catBIdx].items.length; j++) {
      if (validItems.includes(categories[catBIdx].items[j].id)) continue;
      if (getCellState(matrix, catAIdx, itemAIdx, catBIdx, j) === 'confirmed') return 'violated';
    }
    return 'unverified';
  }

  const itemBIdx = catItemToIdx[clue.params.categoryB]?.[clue.params.itemB];
  if (itemAIdx === undefined || itemBIdx === undefined) return 'unverified';

  const cell = getCellState(matrix, catAIdx, itemAIdx, catBIdx, itemBIdx);

  switch (clue.type) {
    case 'direct_positive': {
      if (cell === 'confirmed') return 'satisfied';
      if (cell === 'excluded') return 'violated';
      return 'unverified';
    }

    case 'direct_negative': {
      if (cell === 'excluded') return 'satisfied';
      if (cell === 'confirmed') return 'violated';
      return 'unverified';
    }

    case 'category_same': {
      // A and B share the same C
      // Not currently used in sample puzzles, return unverified
      return 'unverified';
    }

    case 'ordered_before':
    case 'ordered_after': {
      // For ordered categories (like time slots), check relative position
      const catCIdx = categories.findIndex(c => c.id === (clue.params.categoryC ?? clue.params.categoryB));
      if (catCIdx === -1) return 'unverified';
      // Find which time slot each entity is confirmed at
      const getConfirmedIdx = (catIdx: number, itemIdx: number, orderedCatIdx: number): number | null => {
        for (let j = 0; j < categories[orderedCatIdx].items.length; j++) {
          const s = getCellState(matrix, catIdx, itemIdx, orderedCatIdx, j);
          if (s === 'confirmed') return j;
        }
        return null;
      };
      const posA = getConfirmedIdx(catAIdx, itemAIdx, catCIdx);
      const posB = getConfirmedIdx(catBIdx, itemBIdx, catCIdx);
      if (posA === null || posB === null) return 'unverified';
      if (clue.type === 'ordered_before') {
        return posA < posB ? 'satisfied' : 'violated';
      } else {
        return posA > posB ? 'satisfied' : 'violated';
      }
    }

    default:
      return 'unverified';
  }
}

export function validateAllClues(
  matrix: MatrixState,
  puzzle: Puzzle
): Record<string, ClueStatus> {
  const result: Record<string, ClueStatus> = {};
  for (const clue of puzzle.clues) {
    result[clue.id] = validateClue(clue, matrix, puzzle);
  }
  return result;
}

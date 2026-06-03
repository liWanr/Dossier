'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Puzzle, Difficulty } from '@/types/puzzle';
import type { MatrixState, CellState, ClueStatus, DifficultyUnlockState, HistoryRecord } from '@/types/game';
import type { HintResult } from '@/lib/engine/hint';
import {
  initMatrixState,
  applyAndPropagate,
  toggleCellState,
  getCellState,
  checkCompletion,
} from '@/lib/engine/matrixUtils';
import { validateAllClues } from '@/lib/engine/validator';
import { saveGameState, deleteGameState } from '@/lib/db/storage';

function getBrowserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

function computeUnlockState(
  history: Record<string, HistoryRecord>,
  date: string
): DifficultyUnlockState {
  const today = history[date];
  return {
    easy: today?.easy ? 'completed' : 'unlocked',
    medium: today?.easy ? (today?.medium ? 'completed' : 'unlocked') : 'locked',
    hard: today?.medium ? (today?.hard ? 'completed' : 'unlocked') : 'locked',
  };
}

interface GameStore {
  puzzle: Puzzle | null;
  difficulty: Difficulty;
  date: string;
  matrixState: MatrixState;
  clueStatuses: Record<string, ClueStatus>;
  isComplete: boolean;
  unlockState: DifficultyUnlockState;
  history: Record<string, HistoryRecord>;
  undoStack: MatrixState[];
  redoStack: MatrixState[];
  hintCell: HintResult | null;

  loadPuzzle: (puzzle: Puzzle, date: string) => void;
  restoreMatrix: (date: string, difficulty: Difficulty, cells: Record<string, string>, manualCells: Record<string, string>) => void;
  clickCell: (catAIdx: number, itemAIdx: number, catBIdx: number, itemBIdx: number) => void;
  applyHint: () => void;
  undo: () => void;
  redo: () => void;
  resetPuzzle: () => void;
  switchDifficulty: (difficulty: Difficulty) => void;
  setHistory: (history: Record<string, HistoryRecord>) => void;
  markCompleted: (date: string, difficulty: Difficulty) => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    puzzle: null,
    difficulty: 'easy',
    date: '',
    matrixState: { cells: {}, manualCells: {} },
    clueStatuses: {},
    isComplete: false,
    unlockState: { easy: 'unlocked', medium: 'locked', hard: 'locked' },
    history: {},
    undoStack: [],
    redoStack: [],
    hintCell: null,

    loadPuzzle: (puzzle, date) => {
      const { history } = get();
      // Start with empty matrix. restoreMatrix (called from the page) rehydrates
      // from IndexedDB if any save exists. `isComplete` reflects the ACTUAL matrix
      // state — not the history record — so that a reset + reload doesn't keep
      // showing the completion banner over an empty grid.
      const matrixState = initMatrixState(puzzle);
      const clueStatuses = validateAllClues(matrixState, puzzle);
      const isComplete = checkCompletion(matrixState, puzzle);
      const unlockState = computeUnlockState(history, date);
      set({ puzzle, date, matrixState, clueStatuses, isComplete, unlockState, undoStack: [], redoStack: [], hintCell: null });
    },

    restoreMatrix: (date, difficulty, cells, manualCells) => {
      const state = get();
      if (state.date !== date || state.difficulty !== difficulty || !state.puzzle) return;
      const matrixState: MatrixState = {
        cells: cells as Record<string, CellState>,
        manualCells: manualCells as Record<string, CellState>,
      };
      const clueStatuses = validateAllClues(matrixState, state.puzzle);
      const isComplete = checkCompletion(matrixState, state.puzzle);
      set({ matrixState, clueStatuses, isComplete, undoStack: [], redoStack: [], hintCell: null });
    },

    clickCell: (catAIdx, itemAIdx, catBIdx, itemBIdx) => {
      const { puzzle, matrixState, isComplete, undoStack } = get();
      if (!puzzle || isComplete) return;

      const current = getCellState(matrixState, catAIdx, itemAIdx, catBIdx, itemBIdx);
      const next = toggleCellState(current);
      const newMatrix = applyAndPropagate(matrixState, puzzle, catAIdx, itemAIdx, catBIdx, itemBIdx, next);
      const clueStatuses = validateAllClues(newMatrix, puzzle);
      const complete = checkCompletion(newMatrix, puzzle);

      set({ matrixState: newMatrix, clueStatuses, isComplete: complete, undoStack: [...undoStack, matrixState].slice(-50), redoStack: [], hintCell: null });

      const { date, difficulty } = get();

      saveGameState(date, difficulty, newMatrix.cells, newMatrix.manualCells).catch(console.error);
      if (complete) get().markCompleted(date, difficulty);
    },

    applyHint: async () => {
      const { puzzle, matrixState, isComplete, date, difficulty } = get();
      if (!puzzle || isComplete) return;

      let hint: HintResult | null = null;
      try {
        const tz = getBrowserTz();
        const r = await fetch(`/api/puzzle/${date}/hint?tz=${encodeURIComponent(tz)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty, manualCells: matrixState.manualCells }),
        });
        if (!r.ok) { console.error('Hint API failed', r.status); return; }
        const data = await r.json();
        hint = data.hint ?? null;
      } catch (e) {
        console.error('Hint request error', e);
        return;
      }
      if (!hint) return;

      // Re-read current state in case it changed during the fetch
      const cur = get();
      if (!cur.puzzle || cur.date !== date || cur.difficulty !== difficulty || cur.isComplete) return;

      const newMatrix = applyAndPropagate(cur.matrixState, cur.puzzle, hint.catAIdx, hint.itemAIdx, hint.catBIdx, hint.itemBIdx, hint.state);
      const newClueStatuses = validateAllClues(newMatrix, cur.puzzle);
      const complete = checkCompletion(newMatrix, cur.puzzle);

      set({
        matrixState: newMatrix,
        clueStatuses: newClueStatuses,
        isComplete: complete,
        undoStack: [...cur.undoStack, cur.matrixState].slice(-50),
        redoStack: [],
        hintCell: hint,
      });

      saveGameState(date, difficulty, newMatrix.cells, newMatrix.manualCells).catch(console.error);
      if (complete) get().markCompleted(date, difficulty);
    },

    undo: () => {
      const { puzzle, matrixState, undoStack, redoStack } = get();
      if (!puzzle || undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      const clueStatuses = validateAllClues(prev, puzzle);
      const { date, difficulty } = get();
      set({ matrixState: prev, clueStatuses, isComplete: false, undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, matrixState], hintCell: null });
      saveGameState(date, difficulty, prev.cells, prev.manualCells).catch(console.error);
    },

    redo: () => {
      const { puzzle, matrixState, undoStack, redoStack } = get();
      if (!puzzle || redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      const clueStatuses = validateAllClues(next, puzzle);
      const complete = checkCompletion(next, puzzle);
      const { date, difficulty } = get();
      set({ matrixState: next, clueStatuses, isComplete: complete, undoStack: [...undoStack, matrixState].slice(-50), redoStack: redoStack.slice(0, -1), hintCell: null });
      saveGameState(date, difficulty, next.cells, next.manualCells).catch(console.error);
      if (complete) get().markCompleted(date, difficulty);
    },

    resetPuzzle: () => {
      const { puzzle, date, difficulty } = get();
      if (!puzzle) return;
      const matrixState = initMatrixState(puzzle);
      const clueStatuses = validateAllClues(matrixState, puzzle);
      deleteGameState(date, difficulty).catch(console.error);
      set({ matrixState, clueStatuses, isComplete: false, undoStack: [], redoStack: [], hintCell: null });
    },

    switchDifficulty: (difficulty) => {
      if (typeof window !== 'undefined') localStorage.setItem('lastDifficulty', difficulty);
      set({ difficulty });
    },

    setHistory: (history) => {
      const { date } = get();
      const unlockState = computeUnlockState(history, date);
      // Don't touch isComplete here — let loadPuzzle / restoreMatrix derive it
      // from the actual matrix. History only feeds the unlock map.
      set({ history, unlockState });
    },

    markCompleted: (date, difficulty) => {
      const history = { ...get().history };
      if (!history[date]) history[date] = { date };
      history[date][difficulty] = { puzzleId: get().puzzle?.id ?? '', completedAt: Date.now(), duration: 0 };
      const unlockState = computeUnlockState(history, date);
      set({ history, unlockState });
      const nextMap: Partial<Record<Difficulty, Difficulty>> = { easy: 'medium', medium: 'hard' };
      const next = nextMap[difficulty];
      if (next && typeof window !== 'undefined') {
        localStorage.setItem('lastDifficulty', next);
        // 刚好完成时（非历史回顾）自动进入下一难度，留 1.5s 看完成提示
        setTimeout(() => {
          const s = get();
          if (s.date === date && s.difficulty === difficulty && s.isComplete) {
            get().switchDifficulty(next);
          }
        }, 1500);
      }
    },
  }))
);

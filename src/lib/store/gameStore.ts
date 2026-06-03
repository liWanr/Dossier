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
import { saveGameState, deleteGameState, saveHistoryRecord, deleteHistoryRecord } from '@/lib/db/storage';

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
  // Timestamp of the most recent fresh completion (set by markCompleted).
  // UI watches this to drive an auto-advance countdown with a cancel option.
  justCompletedAt: number | null;
  // Practice mode: replay a completed puzzle without persisting any state to
  // IDB and without auto-advancing on completion. History is untouched.
  practiceMode: boolean;

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
  setPracticeMode: (v: boolean) => void;
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
    justCompletedAt: null,
    practiceMode: false,

    setPracticeMode: (v) => set({ practiceMode: v, justCompletedAt: null }),

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
      set({ puzzle, date, matrixState, clueStatuses, isComplete, unlockState, undoStack: [], redoStack: [], hintCell: null, justCompletedAt: null });
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

      const { date, difficulty, practiceMode } = get();

      if (!practiceMode) {
        saveGameState(date, difficulty, newMatrix.cells, newMatrix.manualCells).catch(console.error);
        if (complete) get().markCompleted(date, difficulty);
      }
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

      if (!get().practiceMode) {
        saveGameState(date, difficulty, newMatrix.cells, newMatrix.manualCells).catch(console.error);
        if (complete) get().markCompleted(date, difficulty);
      }
    },

    undo: () => {
      const { puzzle, matrixState, undoStack, redoStack, practiceMode } = get();
      if (!puzzle || undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      const clueStatuses = validateAllClues(prev, puzzle);
      const { date, difficulty } = get();
      set({ matrixState: prev, clueStatuses, isComplete: false, undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, matrixState], hintCell: null });
      if (!practiceMode) {
        saveGameState(date, difficulty, prev.cells, prev.manualCells).catch(console.error);
      }
    },

    redo: () => {
      const { puzzle, matrixState, undoStack, redoStack, practiceMode } = get();
      if (!puzzle || redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      const clueStatuses = validateAllClues(next, puzzle);
      const complete = checkCompletion(next, puzzle);
      const { date, difficulty } = get();
      set({ matrixState: next, clueStatuses, isComplete: complete, undoStack: [...undoStack, matrixState].slice(-50), redoStack: redoStack.slice(0, -1), hintCell: null });
      if (!practiceMode) {
        saveGameState(date, difficulty, next.cells, next.manualCells).catch(console.error);
        if (complete) get().markCompleted(date, difficulty);
      }
    },

    resetPuzzle: () => {
      const { puzzle, date, difficulty, history, practiceMode } = get();
      if (!puzzle) return;
      const matrixState = initMatrixState(puzzle);
      const clueStatuses = validateAllClues(matrixState, puzzle);

      // Practice mode: in-memory reset only. Don't touch IDB or history.
      if (practiceMode) {
        set({
          matrixState, clueStatuses, isComplete: false,
          undoStack: [], redoStack: [], hintCell: null, justCompletedAt: null,
        });
        return;
      }

      // Clear current difficulty's game state from IDB.
      deleteGameState(date, difficulty).catch(console.error);

      // Also clear this difficulty's completion from history — and any
      // "downstream" higher difficulties that depend on it (so unlock chain
      // stays consistent). E.g., resetting medium also clears hard.
      const order: Difficulty[] = ['easy', 'medium', 'hard'];
      const idx = order.indexOf(difficulty);
      const downstream = order.slice(idx);
      const newHistory = { ...history };
      const day = { ...(newHistory[date] ?? { date }) };
      let touched = false;
      for (const d of downstream) {
        if (day[d]) {
          delete day[d];
          touched = true;
          // Also clear saved game state of higher difficulties so they can be
          // played fresh next time too.
          if (d !== difficulty) deleteGameState(date, d).catch(console.error);
        }
      }
      if (touched) {
        if (!day.easy && !day.medium && !day.hard) {
          delete newHistory[date];
          deleteHistoryRecord(date).catch(console.error);
        } else {
          newHistory[date] = day;
          saveHistoryRecord(day).catch(console.error);
        }
      }

      const unlockState = computeUnlockState(newHistory, date);
      set({
        matrixState, clueStatuses, isComplete: false,
        undoStack: [], redoStack: [], hintCell: null, justCompletedAt: null,
        history: newHistory, unlockState,
      });
    },

    switchDifficulty: (difficulty) => {
      if (typeof window !== 'undefined') localStorage.setItem('lastDifficulty', difficulty);
      // Reset the just-completed flag so the new difficulty doesn't get a phantom countdown.
      set({ difficulty, justCompletedAt: null });
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
      set({ history, unlockState, justCompletedAt: Date.now() });
      const nextMap: Partial<Record<Difficulty, Difficulty>> = { easy: 'medium', medium: 'hard' };
      const next = nextMap[difficulty];
      if (next && typeof window !== 'undefined') {
        localStorage.setItem('lastDifficulty', next);
      }
      // Auto-advance timer is now driven by the UI (CompletionBanner countdown)
      // so the player can cancel it. The store just records the completion timestamp.
    },
  }))
);

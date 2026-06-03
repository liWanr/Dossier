import type { Difficulty } from './puzzle';

export type CellState = 'unknown' | 'confirmed' | 'excluded';
export type ClueStatus = 'unverified' | 'satisfied' | 'violated';

// cellKey format: `${catAIdx}:${itemAIdx}||${catBIdx}:${itemBIdx}` where catAIdx < catBIdx
export type CellKey = string;

export interface MatrixState {
  cells: Record<CellKey, CellState>;       // full state (manual + derived)
  manualCells: Record<CellKey, CellState>; // only user-set cells
}

export interface ClueState {
  clueId: string;
  status: ClueStatus;
}

export interface GameState {
  puzzleId: string;
  difficulty: Difficulty;
  date: string;
  matrixState: MatrixState;
  clueStates: ClueState[];
  startTime: number;
  pausedDuration: number;
  isComplete: boolean;
  completedAt?: number;
}

export interface DayCompletion {
  puzzleId: string;
  completedAt: number;
  duration: number; // seconds
}

export interface HistoryRecord {
  date: string;
  easy?: DayCompletion;
  medium?: DayCompletion;
  hard?: DayCompletion;
}

export type DifficultyUnlockState = {
  easy: 'unlocked' | 'locked' | 'completed';
  medium: 'unlocked' | 'locked' | 'completed';
  hard: 'unlocked' | 'locked' | 'completed';
};

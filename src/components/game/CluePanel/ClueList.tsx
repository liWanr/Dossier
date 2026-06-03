'use client';

import type { Puzzle } from '@/types/puzzle';
import type { ClueStatus } from '@/types/game';
import { ClueItem } from './ClueItem';

interface ClueListProps {
  puzzle: Puzzle;
  clueStatuses: Record<string, ClueStatus>;
  activeTerm?: string | null;
  allTerms?: string[];
  onHoverTerm?: (term: string | null) => void;
  onClickTerm?: (term: string) => void;
  hintClueId?: string | null;
}

export function ClueList({ puzzle, clueStatuses, activeTerm, allTerms, onHoverTerm, onClickTerm, hintClueId }: ClueListProps) {
  const satisfied = puzzle.clues.filter(c => clueStatuses[c.id] === 'satisfied').length;
  const violated = puzzle.clues.filter(c => clueStatuses[c.id] === 'violated').length;
  const total = puzzle.clues.length;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-stone-200">
        <h2 className="text-sm font-bold text-stone-800 tracking-wide">线 索</h2>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>
            <span className="font-bold text-emerald-600">{satisfied}</span>
            <span className="text-stone-400">/{total}</span>
          </span>
          {violated > 0 && (
            <span className="font-bold text-red-500">{violated} 矛盾</span>
          )}
        </div>
      </div>

      {/* Progress bar — full width, outside scroll area */}
      <div className="h-1 bg-stone-100">
        <div
          className="h-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${(satisfied / total) * 100}%` }}
        />
      </div>

      {/* Clue list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {puzzle.clues.map((clue, i) => (
          <ClueItem
            key={clue.id}
            clue={clue}
            status={clueStatuses[clue.id] ?? 'unverified'}
            index={i + 1}
            activeTerm={activeTerm}
            allTerms={allTerms}
            onHoverTerm={onHoverTerm}
            onClickTerm={onClickTerm}
            isHinted={clue.id === hintClueId}
          />
        ))}
      </div>
    </div>
  );
}

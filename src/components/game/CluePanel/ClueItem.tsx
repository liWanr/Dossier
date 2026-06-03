'use client';

import type { Clue } from '@/types/puzzle';
import type { ClueStatus } from '@/types/game';
import { useSettingsStore } from '@/lib/store/settingsStore';

interface ClueItemProps {
  clue: Clue;
  status: ClueStatus;
  index: number;
  activeTerm?: string | null;
  allTerms?: string[];
  onHoverTerm?: (term: string | null) => void;
  onClickTerm?: (term: string) => void;
  isHinted?: boolean;
}

function splitByTerms(text: string, terms: string[]): { value: string; isTerm: boolean }[] {
  if (!terms.length) return [{ value: text, isTerm: false }];
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const pattern = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'g');
  return text.split(regex).filter(Boolean).map(v => ({ value: v, isTerm: terms.includes(v) }));
}

export function ClueItem({ clue, status, index, activeTerm, allTerms = [], onHoverTerm, onClickTerm, isHinted }: ClueItemProps) {
  const isSatisfied = status === 'satisfied';
  const isViolated = status === 'violated';
  const cb = useSettingsStore(s => s.colorMode === 'colorblind');
  const hc = useSettingsStore(s => s.highContrast);

  const segments = splitByTerms(clue.text, allTerms);

  // Palette by mode
  const okBg     = cb ? (hc ? 'bg-blue-100 border-2 border-blue-700' : 'bg-blue-50 border border-blue-200')
                       : (hc ? 'bg-emerald-100 border-2 border-emerald-700' : 'bg-emerald-50 border border-emerald-200');
  const badBg    = cb ? (hc ? 'bg-orange-100 border-2 border-orange-700' : 'bg-orange-50 border border-orange-200')
                       : (hc ? 'bg-red-100 border-2 border-red-700' : 'bg-red-50 border border-red-200');
  const okText   = cb ? 'text-blue-800'   : 'text-emerald-800';
  const badText  = cb ? 'text-orange-800' : 'text-red-700';
  const okBadge  = cb ? 'bg-blue-500 border-blue-500'    : 'bg-emerald-500 border-emerald-500';
  const badBadge = cb ? 'bg-orange-500 border-orange-500' : 'bg-red-400 border-red-400';

  return (
    <div className={[
      'flex items-start gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200',
      isSatisfied ? okBg : '',
      isViolated ? badBg : '',
      !isSatisfied && !isViolated && !isHinted ? (hc ? 'bg-stone-100 border-2 border-stone-400' : 'bg-stone-50 border border-stone-200') : '',
      isHinted ? 'bg-amber-50 border border-amber-400 animate-pulse' : '',
    ].join(' ')}>
      {/* Checkbox indicator */}
      <span className={[
        'flex-shrink-0 w-4 h-4 mt-0.5 rounded-sm border flex items-center justify-center text-xs font-bold text-white',
        isSatisfied ? okBadge : '',
        isViolated ? badBadge : '',
        !isSatisfied && !isViolated ? 'border-stone-400 bg-white' : '',
      ].join(' ')}>
        {isSatisfied && (
          <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={hc ? '2.5' : '2'}>
            {cb && <circle cx="5" cy="5" r="4" />}
            <path d="M1.5 5l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isViolated && (
          <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={hc ? '2.5' : '2'}>
            {cb && <rect x="1" y="1" width="8" height="8" rx="1" />}
            <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
          </svg>
        )}
      </span>

      {/* Clue text */}
      <span className={[
        'leading-snug flex-1',
        isSatisfied ? okText : '',
        isViolated ? badText : '',
        !isSatisfied && !isViolated ? 'text-stone-700' : '',
      ].join(' ')}>
        {segments.map((seg, i) =>
          seg.isTerm ? (
            <span
              key={i}
              className={[
                'rounded-sm px-0.5 cursor-default',
                seg.value === activeTerm
                  ? 'bg-amber-200 text-amber-900'
                  : 'hover:bg-amber-100',
              ].join(' ')}
              onMouseEnter={() => onHoverTerm?.(seg.value)}
              onMouseLeave={() => onHoverTerm?.(null)}
              onClick={() => onClickTerm?.(seg.value)}
            >
              {seg.value}
            </span>
          ) : (
            <span key={i}>{seg.value}</span>
          )
        )}
      </span>

    </div>
  );
}

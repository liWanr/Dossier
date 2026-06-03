'use client';

import type { CellState } from '@/types/game';
import { useSettingsStore } from '@/lib/store/settingsStore';

interface MatrixCellProps {
  state: CellState;
  onClick: () => void;
  disabled?: boolean;
  isManual?: boolean;
  isAuto?: boolean;
  size?: number;
  // Optional separate height — for layouts that want rectangular (e.g. tall) cells
  // without changing horizontal width. Defaults to `size`.
  height?: number;
  isHinted?: boolean;
}

export function MatrixCell({ state, onClick, disabled, isManual, isAuto, size = 36, height, isHinted }: MatrixCellProps) {
  const colorMode    = useSettingsStore(s => s.colorMode);
  const highContrast = useSettingsStore(s => s.highContrast);

  // Palette by mode. Colorblind uses orange/blue (CVD-safe).
  // High contrast bumps saturation and adds a darker outline.
  const cb = colorMode === 'colorblind';
  const hc = highContrast;

  let bg = '';
  if (state === 'confirmed') {
    if (cb) {
      bg = hc
        ? 'bg-blue-500 text-white ring-2 ring-blue-900 ring-inset'
        : 'bg-blue-100 text-blue-700' + (isManual ? '' : ' opacity-90');
    } else {
      bg = hc
        ? 'bg-emerald-500 text-white ring-2 ring-emerald-900 ring-inset'
        : 'bg-emerald-100 text-emerald-600';
    }
  } else if (state === 'excluded') {
    if (cb) {
      bg = hc
        ? (isManual ? 'bg-orange-500 text-white ring-2 ring-orange-900 ring-inset' : 'bg-orange-400 text-white ring-2 ring-orange-800 ring-inset')
        : (isManual ? 'bg-orange-100 text-orange-700' : 'bg-orange-50 text-orange-400');
    } else {
      bg = hc
        ? (isManual ? 'bg-red-500 text-white ring-2 ring-red-900 ring-inset' : 'bg-red-400 text-white ring-2 ring-red-800 ring-inset')
        : (isManual ? 'bg-red-100 text-red-500' : 'bg-red-50 text-red-300');
    }
  } else {
    bg = disabled ? '' : (hc ? 'hover:bg-amber-100 ring-1 ring-stone-300 ring-inset' : 'hover:bg-amber-50');
  }

  // Icon stroke width scales up in HC mode for clearer shapes
  const stroke = hc ? '3' : '2.5';
  const xStroke = hc ? '2.6' : '2';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center justify-center transition-colors duration-100',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-300',
        disabled && !isAuto ? 'cursor-not-allowed' : isAuto ? 'cursor-default' : 'cursor-pointer',
        isHinted ? 'bg-amber-100 animate-pulse outline outline-2 outline-amber-400' : '',
        bg,
      ].join(' ')}
      style={{ width: size, height: height ?? size }}
      aria-label={state === 'confirmed' ? '确认' : state === 'excluded' ? '排除' : '未知'}
    >
      {state === 'confirmed' && (
        <svg viewBox="0 0 16 16" className={hc ? 'w-5 h-5' : 'w-3.5 h-3.5'} fill="none" stroke="currentColor" strokeWidth={stroke}>
          {/* Colorblind mode: add a circle outline to make shape distinct from X */}
          {cb && <circle cx="8" cy="8" r="6.5" />}
          <path d="M3.5 8l3.2 3.2L12.5 5.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === 'excluded' && (
        <svg viewBox="0 0 16 16" className={hc ? 'w-5 h-5' : 'w-3 h-3'} fill="none" stroke="currentColor" strokeWidth={xStroke}>
          {/* Colorblind mode: square outline differentiates from confirmed circle */}
          {cb && <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />}
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

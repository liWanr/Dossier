import { NextRequest, NextResponse } from 'next/server';
import { getPuzzlesByDateInternal } from '@/lib/db/puzzleDb';
import { getAuthoritativeUtc, latestPlayableDate } from '@/lib/time/serverTime';
import { applyAndPropagate, initMatrixState, parseCellKey } from '@/lib/engine/matrixUtils';
import { validateAllClues } from '@/lib/engine/validator';
import { computeHint } from '@/lib/engine/hint';
import type { CellKey, CellState, MatrixState } from '@/types/game';
import type { Difficulty } from '@/types/puzzle';

export const dynamic = 'force-dynamic';

interface HintRequestBody {
  difficulty?: Difficulty;
  manualCells?: Record<string, string>; // CellKey -> CellState
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  // Server-controlled gating — see /api/puzzle/[date]/route.ts for rationale.
  const utc    = await getAuthoritativeUtc();
  const latest = latestPlayableDate(utc);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }
  if (date > latest) {
    return NextResponse.json({ error: 'locked' }, { status: 403 });
  }

  let body: HintRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const difficulty = body.difficulty;
  if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }

  const all = await getPuzzlesByDateInternal(date);
  if (!all) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const puzzle = all[difficulty];
  if (!puzzle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Reconstruct full matrix state from manual cells via propagation
  let matrix: MatrixState = initMatrixState(puzzle);
  const manual = body.manualCells ?? {};
  for (const [key, state] of Object.entries(manual)) {
    if (state !== 'confirmed' && state !== 'excluded') continue;
    try {
      const [cA, iA, cB, iB] = parseCellKey(key as CellKey);
      matrix = applyAndPropagate(matrix, puzzle, cA, iA, cB, iB, state as CellState);
    } catch {
      // ignore malformed key
    }
  }

  const clueStatuses = validateAllClues(matrix, puzzle);
  const hint = computeHint(matrix, puzzle, clueStatuses);
  if (!hint) return NextResponse.json({ hint: null });

  return NextResponse.json({ hint });
}

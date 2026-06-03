// Shared across all themes: the time-slot strings and period bucketing logic.
// Time labels stay constant (现代钟点制) regardless of theme — keeping the
// 上午 / 下午 / 晚上 bucketing semantics consistent across the puzzle engine.

export const TIME_ITEMS = [
  '上午9点', '上午11点', '正午12点', '下午2点', '下午4点',
  '傍晚6点', '晚上8点', '晚上10点',
];

export function getTimePeriod(t) {
  if (t.includes('上午')) return '上午';
  if (t.includes('正午') || t.includes('下午')) return '下午';
  return '晚上';
}

// Pick one variant from a templates array by a deterministic RNG. Falls back to
// the first variant if the templates entry is missing or empty.
export function pickVariant(rng, variants, fallback) {
  if (!Array.isArray(variants) || variants.length === 0) return fallback;
  return variants[rng.int(variants.length)];
}

// Normalize a category-pair key. Templates may register `detective_case` or
// `case_detective` — order is canonical (sorted).
export function pairKey(idA, idB) {
  return [idA, idB].sort().join('_');
}

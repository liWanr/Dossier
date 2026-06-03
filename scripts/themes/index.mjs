import { classic } from './classic.mjs';
import { ancient } from './ancient.mjs';
import { school }  from './school.mjs';
import { pirate }  from './pirate.mjs';
import { space }   from './space.mjs';
import { pickVariant } from './_shared.mjs';

// Order matters: theme rotation derives from this list.
// Adding a theme later: append it; existing dates keep their assignment.
export const THEMES = [classic, ancient, school, pirate, space];

const THEME_BY_ID = Object.fromEntries(THEMES.map(t => [t.id, t]));

/** Theme for a given date — deterministic so all three difficulties of the
 *  same day share the same theme (consistent universe across easy/medium/hard). */
export function themeForDate(dateStr) {
  const n = parseInt(dateStr.replace(/-/g, ''), 10);
  return THEMES[((n % THEMES.length) + THEMES.length) % THEMES.length];
}

export function themeById(id) { return THEME_BY_ID[id] ?? null; }

/** Format item name with theme-specific cosmetic suffix (e.g. 案件 → "X案"). */
export function formatItem(theme, catId, name) {
  const fmt = theme.formatItem?.[catId];
  return fmt ? fmt(name) : name;
}

// Internal: pick a template that may be registered under either key direction
// and pass args matching the registered direction's convention.
function pickPairTemplate(map, catA, catB, rng, fallback) {
  const k1 = `${catA}_${catB}`;
  const k2 = `${catB}_${catA}`;
  if (map[k1]) return { tpl: pickVariant(rng, map[k1], fallback), reverse: false };
  if (map[k2]) return { tpl: pickVariant(rng, map[k2], fallback), reverse: true };
  return { tpl: fallback, reverse: false };
}

export function posTxt(theme, catA, rawA, catB, rawB, rng) {
  const fa = formatItem(theme, catA, rawA);
  const fb = formatItem(theme, catB, rawB);
  const { tpl, reverse } = pickPairTemplate(theme.POS, catA, catB, rng, (x, y) => `${x}与${y}有关`);
  return reverse ? tpl(fb, fa) : tpl(fa, fb);
}
export function negTxt(theme, catA, rawA, catB, rawB, rng) {
  const fa = formatItem(theme, catA, rawA);
  const fb = formatItem(theme, catB, rawB);
  const { tpl, reverse } = pickPairTemplate(theme.NEG, catA, catB, rng, (x, y) => `${x}与${y}无关`);
  return reverse ? tpl(fb, fa) : tpl(fa, fb);
}
export function ordTxt(theme, catA, rawA, catB, rawB, rng) {
  // ORD templates: same-category ordering (e.g. case_case)
  const fa = formatItem(theme, catA, rawA);
  const fb = formatItem(theme, catB, rawB);
  const key = `${catA}_${catB}`;
  const variants = theme.ORD[key];
  const tpl = pickVariant(rng, variants, (x, y) => `${x}早于${y}`);
  return tpl(fa, fb);
}
export function rangeTxt(theme, cat, rawA, period, rng) {
  const fa = formatItem(theme, cat, rawA);
  const variants = theme.RANGE[cat];
  const tpl = pickVariant(rng, variants, (x, p) => `${x}在${p}时段`);
  return tpl(fa, period);
}

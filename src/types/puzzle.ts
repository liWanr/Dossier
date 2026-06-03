export type Difficulty = 'easy' | 'medium' | 'hard';

export type ClueType =
  | 'direct_positive'       // A 就是 B
  | 'direct_negative'       // A 不是 B
  | 'category_same'         // A 与 B 属于同一个 C（即拥有相同的C类元素）
  | 'category_different'    // A 与 B 不属于同一个 C
  | 'ordered_before'        // A 在有序类别中排在 B 之前
  | 'ordered_after'         // A 在有序类别中排在 B 之后
  | 'ordered_adjacent'      // A 与 B 相邻
  | 'ordered_not_adjacent'  // A 与 B 不相邻
  | 'ordered_gap'           // A 与 B 间隔 N 个位置
  | 'conditional'           // 若 A=X 则 B=Y
  | 'category_range';       // A 属于 B 类别中的某个子集（如"下午时段"）

export interface CategoryItem {
  id: string;
  name: string;
  emoji?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  items: CategoryItem[];
}

export interface ClueParams {
  // Primary entity
  categoryA: string;
  itemA: string;
  // Related entity
  categoryB: string;
  itemB: string;
  // For category_same/different: the shared category
  categoryC?: string;
  // For ordered_gap
  gap?: number;
  // For conditional
  categoryD?: string;
  itemD?: string;
  // For category_range: the valid item ids in categoryB
  validItems?: string[];
}

export interface Clue {
  id: string;
  type: ClueType;
  text: string;
  params: ClueParams;
}

// Solution maps: for each entity (identified by primary category item),
// maps to all other category assignments.
// solution.assignments[entityId] = { categoryId: itemId, ... }
export interface Solution {
  // The "entity" dimension — e.g., each "case" entity
  primaryCategoryId: string;
  assignments: Record<string, Record<string, string>>;
}

export interface Puzzle {
  id: string;
  date: string;        // YYYY-MM-DD
  difficulty: Difficulty;
  title: string;
  description: string;
  categories: Category[];
  clues: Clue[];
  // solution is only present on the server. The client receives sanitized puzzles
  // with primaryCategoryId hoisted as a top-level field (needed for completion checks).
  solution?: Solution;
  primaryCategoryId?: string;
}

export interface DailyPuzzles {
  date: string;
  easy: Puzzle;
  medium: Puzzle;
  hard: Puzzle;
}

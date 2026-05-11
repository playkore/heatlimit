import type { GameRule } from "./api";

export function applyRules<T extends GameRule>(
  rules: readonly T[],
  fn: (rule: T) => void,
): void {
  [...rules]
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0))
    .forEach(fn);
}

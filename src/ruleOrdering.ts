import type { Rule } from "./types";

export interface RuleOrderingResult {
  rules: Rule[];
  selectedIndex: number | null;
}

export function reorderRules(
  rules: Rule[],
  fromIndex: number,
  toIndex: number,
  selectedIndex: number | null,
): RuleOrderingResult {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rules.length ||
    toIndex >= rules.length
  ) {
    return { rules, selectedIndex };
  }

  const nextRules = [...rules];
  const [movedRule] = nextRules.splice(fromIndex, 1);
  nextRules.splice(toIndex, 0, movedRule);

  let nextSelectedIndex = selectedIndex;
  if (selectedIndex === fromIndex) {
    nextSelectedIndex = toIndex;
  } else if (selectedIndex !== null && fromIndex < toIndex) {
    if (selectedIndex > fromIndex && selectedIndex <= toIndex) {
      nextSelectedIndex = selectedIndex - 1;
    }
  } else if (selectedIndex !== null && fromIndex > toIndex) {
    if (selectedIndex >= toIndex && selectedIndex < fromIndex) {
      nextSelectedIndex = selectedIndex + 1;
    }
  }

  return { rules: nextRules, selectedIndex: nextSelectedIndex };
}

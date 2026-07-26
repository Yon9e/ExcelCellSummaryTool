import type { Rule } from "./types";

let ruleSequence = 0;

export function createRuleId(): string {
  ruleSequence += 1;
  return `rule-${Date.now()}-${ruleSequence}`;
}

export function ensureRuleIds(rules: Rule[]): Rule[] {
  const knownIds = new Set<string>();
  return rules.map((rule) => {
    const id = rule.id?.trim();
    if (id && !knownIds.has(id)) {
      knownIds.add(id);
      return { ...rule, id };
    }
    let nextId = createRuleId();
    while (knownIds.has(nextId)) nextId = createRuleId();
    knownIds.add(nextId);
    return { ...rule, id: nextId };
  });
}

export function createEmptyRule(): Rule {
  return {
    id: createRuleId(),
    output_column: "",
    sheet_mode: "contains",
    sheet_value: "",
    cell: "",
  };
}

export function toggleRuleSelection(
  selectedIds: ReadonlySet<string>,
  ruleId: string,
  additive: boolean,
): Set<string> {
  if (!additive) {
    if (selectedIds.size === 1 && selectedIds.has(ruleId)) return new Set();
    return new Set([ruleId]);
  }
  const next = new Set(selectedIds);
  if (next.has(ruleId)) next.delete(ruleId);
  else next.add(ruleId);
  return next;
}

export function toggleRuleRange(
  ruleIds: string[],
  selectedIds: ReadonlySet<string>,
  startId: string,
  endId: string,
): Set<string> {
  const startIndex = ruleIds.indexOf(startId);
  const endIndex = ruleIds.indexOf(endId);
  if (startIndex < 0 || endIndex < 0) return new Set(selectedIds);
  const range = ruleIds.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
  const shouldInvert = range.some((ruleId) => selectedIds.has(ruleId));
  const next = new Set(selectedIds);
  for (const ruleId of range) {
    if (shouldInvert && next.has(ruleId)) next.delete(ruleId);
    else next.add(ruleId);
  }
  return next;
}

export function deleteSelectedRules(rules: Rule[], selectedIds: ReadonlySet<string>): Rule[] {
  return rules.filter((rule) => !rule.id || !selectedIds.has(rule.id));
}

export function duplicateSelectedRules(
  rules: Rule[],
  selectedIds: ReadonlySet<string>,
): { rules: Rule[]; selectedIds: Set<string> } {
  const selectedIndexes = rules
    .map((rule, index) => rule.id && selectedIds.has(rule.id) ? index : -1)
    .filter((index) => index >= 0);
  if (!selectedIndexes.length) return { rules: [...rules], selectedIds: new Set() };

  const copies = selectedIndexes.map((index) => ({ ...rules[index], id: createRuleId() }));
  const insertIndex = Math.max(...selectedIndexes) + 1;
  return {
    rules: [...rules.slice(0, insertIndex), ...copies, ...rules.slice(insertIndex)],
    selectedIds: new Set(copies.map((rule) => rule.id).filter((id): id is string => Boolean(id))),
  };
}

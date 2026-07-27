import type { Rule } from "./types";
import { ensureRuleIds } from "./ruleSelection";

export function normalizeSchemeRules(rules: Rule[]): Rule[] {
  return ensureRuleIds(rules.map((rule) => ({ ...rule })));
}

const ruleKeys = new WeakMap<object, string>();
let nextRuleKey = 1;

export function getRuleRowKey(rule: object): string {
  const existingKey = ruleKeys.get(rule);
  if (existingKey) return existingKey;

  const key = `rule-${nextRuleKey}`;
  nextRuleKey += 1;
  ruleKeys.set(rule, key);
  return key;
}

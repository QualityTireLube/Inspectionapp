/**
 * Rule Evaluation Engine
 * 
 * Evaluates showIf/readOnlyIf/required rules against form context
 * for dynamic field visibility and behavior.
 */

import type { Rule } from '../../config/fieldRegistry';

/**
 * Evaluates a rule against the provided context
 * @param rule - The rule to evaluate
 * @param context - Form values and metadata
 * @returns boolean indicating if rule passes
 */
export function evaluateRule(rule: Rule | undefined, context: Record<string, unknown>): boolean {
  if (!rule) return true;

  // Simple field-based conditions
  if ('when' in rule) {
    const value = getNestedValue(context, rule.when);
    
    if (rule.eq !== undefined) {
      return value === rule.eq;
    }
    
    if (rule.in !== undefined) {
      return Array.isArray(rule.in) && rule.in.includes(value);
    }
    
    if (rule.truthy !== undefined) {
      const isTruthy = Boolean(value);
      return rule.truthy ? isTruthy : !isTruthy;
    }
    
    // Default to truthy check if no specific condition
    return Boolean(value);
  }

  // Logical combinations
  if ('all' in rule) {
    return rule.all.every(r => evaluateRule(r, context));
  }

  if ('any' in rule) {
    return rule.any.some(r => evaluateRule(r, context));
  }

  if ('not' in rule) {
    return !evaluateRule(rule.not, context);
  }

  return false;
}

/**
 * Gets nested value from object using dot notation
 * @param obj - Object to search in
 * @param path - Dot-separated path (e.g., 'user.name' or 'battery_condition.main')
 * @returns The value at the path or undefined
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: any, key: string) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Evaluates multiple rules and returns field visibility/state map
 * @param fields - Array of field IDs to evaluate
 * @param fieldDefs - Field definitions containing rules
 * @param context - Form values and metadata
 * @returns Map of field states
 */
export function evaluateFieldStates(
  fields: string[],
  fieldDefs: Record<string, { showIf?: Rule; readOnlyIf?: Rule; required?: boolean | Rule }>,
  context: Record<string, unknown>
): Record<string, { visible: boolean; readOnly: boolean; required: boolean }> {
  const result: Record<string, { visible: boolean; readOnly: boolean; required: boolean }> = {};

  fields.forEach(fieldId => {
    const fieldDef = fieldDefs[fieldId];
    if (!fieldDef) {
      result[fieldId] = { visible: true, readOnly: false, required: false };
      return;
    }

    const visible = evaluateRule(fieldDef.showIf, context);
    const readOnly = evaluateRule(fieldDef.readOnlyIf, context);
    
    let required = false;
    if (typeof fieldDef.required === 'boolean') {
      required = fieldDef.required;
    } else if (fieldDef.required) {
      required = evaluateRule(fieldDef.required, context);
    }

    result[fieldId] = { visible, readOnly, required };
  });

  return result;
}

/**
 * Creates an enhanced context with system variables
 * @param formValues - Current form values
 * @param userInfo - User information (role, location, etc.)
 * @param inspectionType - Current inspection type
 * @returns Enhanced context for rule evaluation
 */
export function createRuleContext(
  formValues: Record<string, unknown>,
  userInfo: { role?: string; location?: string; userId?: string } = {},
  inspectionType?: string
): Record<string, unknown> {
  return {
    ...formValues,
    // System variables prefixed with $
    $role: userInfo.role,
    $location: userInfo.location,
    $userId: userInfo.userId,
    $inspectionType: inspectionType,
    // Helper flags
    system_field: true, // Used for read-only system fields
    // Add more system variables as needed
  };
}

/**
 * Memoized rule evaluator for performance
 * Uses a simple cache to avoid re-evaluating identical rules
 */
class RuleEvaluatorCache {
  private cache = new Map<string, boolean>();
  private maxCacheSize = 1000;

  evaluate(rule: Rule | undefined, context: Record<string, unknown>): boolean {
    if (!rule) return true;

    // Create cache key from rule and relevant context values
    const cacheKey = this.createCacheKey(rule, context);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = evaluateRule(rule, context);
    
    // Manage cache size
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, result);
    return result;
  }

  private createCacheKey(rule: Rule, context: Record<string, unknown>): string {
    // Extract only the context values that matter for this rule
    const relevantContext = this.extractRelevantContext(rule, context);
    return JSON.stringify({ rule, context: relevantContext });
  }

  private extractRelevantContext(rule: Rule, context: Record<string, unknown>): Record<string, unknown> {
    const relevantKeys = new Set<string>();
    this.extractContextKeys(rule, relevantKeys);
    
    const relevantContext: Record<string, unknown> = {};
    relevantKeys.forEach(key => {
      if (key in context) {
        relevantContext[key] = context[key];
      }
    });
    
    return relevantContext;
  }

  private extractContextKeys(rule: Rule, keys: Set<string>): void {
    if ('when' in rule) {
      keys.add(rule.when);
    } else if ('all' in rule) {
      rule.all.forEach(r => this.extractContextKeys(r, keys));
    } else if ('any' in rule) {
      rule.any.forEach(r => this.extractContextKeys(r, keys));
    } else if ('not' in rule) {
      this.extractContextKeys(rule.not, keys);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const ruleEvaluatorCache = new RuleEvaluatorCache();

/**
 * Evaluates a rule with caching
 */
export function evaluateRuleCached(rule: Rule | undefined, context: Record<string, unknown>): boolean {
  return ruleEvaluatorCache.evaluate(rule, context);
}

/**
 * Common rule patterns for reuse
 */
export const COMMON_RULES = {
  // Field value checks
  hasValue: (field: string): Rule => ({ when: field, truthy: true }),
  isEmpty: (field: string): Rule => ({ when: field, truthy: false }),
  equals: (field: string, value: unknown): Rule => ({ when: field, eq: value }),
  oneOf: (field: string, values: unknown[]): Rule => ({ when: field, in: values }),

  // System checks
  isQuickCheck: (): Rule => ({ when: '$inspectionType', eq: 'quick_check' }),
  isNoCheck: (): Rule => ({ when: '$inspectionType', eq: 'no_check' }),
  isAdmin: (): Rule => ({ when: '$role', eq: 'admin' }),

  // Complex conditions
  batteryBad: (): Rule => ({ 
    any: [
      { when: 'battery_condition_main', eq: 'bad' },
      { when: 'battery_condition_main', eq: 'warning' }
    ] 
  }),
  
  stateInspectionExpired: (): Rule => ({ 
    when: 'state_inspection_status', eq: 'expired' 
  }),

  // Combinations
  and: (...rules: Rule[]): Rule => ({ all: rules }),
  or: (...rules: Rule[]): Rule => ({ any: rules }),
  not: (rule: Rule): Rule => ({ not: rule })
};

/**
 * Rule validation utility
 * @param rule - Rule to validate
 * @returns Array of validation errors
 */
export function validateRule(rule: Rule): string[] {
  const errors: string[] = [];

  try {
    JSON.stringify(rule); // Basic JSON serialization check
  } catch {
    errors.push('Rule is not serializable');
    return errors;
  }

  // Recursive validation
  if ('when' in rule) {
    if (!rule.when || typeof rule.when !== 'string') {
      errors.push('Rule "when" field must be a non-empty string');
    }
    
    const conditionCount = [
      rule.eq !== undefined,
      rule.in !== undefined,
      rule.truthy !== undefined
    ].filter(Boolean).length;

    if (conditionCount > 1) {
      errors.push('Rule can only have one condition (eq, in, or truthy)');
    }

    if (rule.in !== undefined && !Array.isArray(rule.in)) {
      errors.push('Rule "in" condition must be an array');
    }
  } else if ('all' in rule) {
    if (!Array.isArray(rule.all)) {
      errors.push('Rule "all" must be an array');
    } else {
      rule.all.forEach((subRule, index) => {
        const subErrors = validateRule(subRule);
        errors.push(...subErrors.map(err => `all[${index}]: ${err}`));
      });
    }
  } else if ('any' in rule) {
    if (!Array.isArray(rule.any)) {
      errors.push('Rule "any" must be an array');
    } else {
      rule.any.forEach((subRule, index) => {
        const subErrors = validateRule(subRule);
        errors.push(...subErrors.map(err => `any[${index}]: ${err}`));
      });
    }
  } else if ('not' in rule) {
    const subErrors = validateRule(rule.not);
    errors.push(...subErrors.map(err => `not: ${err}`));
  } else {
    errors.push('Rule must have one of: when, all, any, or not');
  }

  return errors;
}

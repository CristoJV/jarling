import type { Money } from '@/domain/value-objects/money';

export type CategoryAssignmentPlan =
  | Readonly<{ kind: 'none'; amountCents: 0 }>
  | Readonly<{
      kind: 'assign-directly' | 'move-money';
      amountCents: number;
    }>;

export function planCategoryAssignment(
  required: Money,
  readyToAssign: Money,
): CategoryAssignmentPlan {
  if (required.cents <= 0) return { kind: 'none', amountCents: 0 };
  return {
    kind:
      readyToAssign.cents >= required.cents ? 'assign-directly' : 'move-money',
    amountCents: required.cents,
  };
}

import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { BudgetAllocationMovement } from '@/domain/entities/budget-allocation-movement';
import { Money } from '@/domain/value-objects/money';

export type CategoryBalanceHistoryPoint = Readonly<{
  day: number;
  position: number;
  amount: Money;
  kind: 'opening' | 'assignment' | 'activity' | 'closing';
  retroactive: boolean;
}>;

export function daysInBudgetMonth(month: string): number {
  assertValidBudgetMonth(month);
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  if (monthNumber !== 2) {
    return [4, 6, 9, 11].includes(monthNumber) ? 30 : 31;
  }
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return leap ? 29 : 28;
}

export function calculateCategoryBalanceHistory(
  input: Readonly<{
    categoryId: string;
    month: string;
    today: string;
    openingAvailable: Money;
    movements: readonly BudgetAllocationMovement[];
    activity: readonly Readonly<{ date: string; amount: Money }>[];
  }>,
): readonly CategoryBalanceHistoryPoint[] {
  const finalDay = daysInBudgetMonth(input.month);
  const throughDay =
    input.today.slice(0, 7) === input.month
      ? Math.min(finalDay, Math.max(1, Number(input.today.slice(8, 10))))
      : finalDay;
  const firstDate = `${input.month}-01`;
  const lastDate = `${input.month}-${String(finalDay).padStart(2, '0')}`;
  const assignments = new Map<
    number,
    { deltaCents: number; retroactive: boolean }
  >();
  const activity = new Map<number, number>();

  for (const movement of input.movements) {
    if (movement.month !== input.month) continue;
    const direction =
      movement.destinationCategoryId === input.categoryId
        ? 1
        : movement.sourceCategoryId === input.categoryId
          ? -1
          : 0;
    if (direction === 0) continue;

    const occurredOn = movement.occurredOn;
    const retroactive = occurredOn !== undefined && occurredOn > lastDate;
    const day =
      occurredOn === undefined || occurredOn < firstDate
        ? 1
        : retroactive
          ? finalDay
          : Number(occurredOn.slice(8, 10));
    if (day > throughDay) continue;
    const current = assignments.get(day) ?? {
      deltaCents: 0,
      retroactive: false,
    };
    assignments.set(day, {
      deltaCents: current.deltaCents + direction * movement.amount.cents,
      retroactive: current.retroactive || retroactive,
    });
  }

  for (const entry of input.activity) {
    if (entry.date.slice(0, 7) !== input.month) continue;
    const day = Number(entry.date.slice(8, 10));
    if (day > throughDay) continue;
    activity.set(day, (activity.get(day) ?? 0) + entry.amount.cents);
  }

  const days = new Set([...assignments.keys(), ...activity.keys()]);
  const points: CategoryBalanceHistoryPoint[] = [
    {
      day: 0,
      position: 0,
      amount: input.openingAvailable,
      kind: 'opening',
      retroactive: false,
    },
  ];
  let balanceCents = input.openingAvailable.cents;

  for (const day of [...days].sort((left, right) => left - right)) {
    const previousDay = day - 1;
    if (previousDay > (points.at(-1)?.position ?? 0)) {
      points.push({
        day: previousDay,
        position: previousDay,
        amount: Money.fromCents(balanceCents),
        kind: 'closing',
        retroactive: false,
      });
    }
    const assignment = assignments.get(day);
    const activityCents = activity.get(day) ?? 0;
    if (assignment && assignment.deltaCents !== 0) {
      balanceCents += assignment.deltaCents;
      points.push({
        day,
        position: activityCents === 0 ? day : day - 0.35,
        amount: Money.fromCents(balanceCents),
        kind: 'assignment',
        retroactive: assignment.retroactive,
      });
    }
    if (activityCents !== 0) {
      balanceCents += activityCents;
      points.push({
        day,
        position: day,
        amount: Money.fromCents(balanceCents),
        kind: 'activity',
        retroactive: false,
      });
    }
  }

  if (points.at(-1)?.position !== throughDay) {
    points.push({
      day: throughDay,
      position: throughDay,
      amount: Money.fromCents(balanceCents),
      kind: 'closing',
      retroactive: false,
    });
  }
  return points;
}

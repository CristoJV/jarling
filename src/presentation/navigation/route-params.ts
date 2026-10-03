import { isValidBudgetMonth } from '@/domain/entities/budget-allocation';
import { localBudgetMonth } from '@/presentation/utils/calendar';

export type RouteParameter = string | string[] | undefined;

export function routeString(value: RouteParameter): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.trim() || undefined;
}

export function routeId(value: RouteParameter): string {
  return routeString(value) ?? '';
}

export function routeBudgetMonth(
  value: RouteParameter,
  fallbackDate = new Date(),
): string {
  const candidate = routeString(value);
  return candidate && isValidBudgetMonth(candidate)
    ? candidate
    : localBudgetMonth(fallbackDate);
}

export function routePositiveInteger(value: RouteParameter): number {
  const candidate = routeString(value);
  if (!candidate || !/^\d+$/.test(candidate)) return 0;
  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

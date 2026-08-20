import { appendMoneyDigit, removeMoneyDigit } from '@/presentation/utils/money';

export type MoneyOperator = '+' | '-' | '×' | '÷';

export type MoneyCalculatorState = Readonly<{
  pending: Readonly<{ leftCents: number; operator: MoneyOperator }> | null;
  overwriteInput: boolean;
}>;

export type MoneyCalculatorTransition = Readonly<{
  state: MoneyCalculatorState;
  valueCents: number;
}>;

export function createMoneyCalculatorState(
  overwriteInput = true,
): MoneyCalculatorState {
  return { pending: null, overwriteInput };
}

export function calculateMoneyOperation(
  leftCents: number,
  rightCents: number,
  operator: MoneyOperator,
): number {
  let result: number;
  switch (operator) {
    case '+':
      result = leftCents + rightCents;
      break;
    case '-':
      result = leftCents - rightCents;
      break;
    case '×':
      result = Math.round((leftCents * rightCents) / 100);
      break;
    case '÷':
      result =
        rightCents === 0
          ? leftCents
          : Math.round((leftCents * 100) / rightCents);
      break;
  }
  return Number.isSafeInteger(result) ? result : leftCents;
}

export function appendCalculatorDigit(
  state: MoneyCalculatorState,
  valueCents: number,
  digit: number,
): MoneyCalculatorTransition {
  return {
    state: { ...state, overwriteInput: false },
    valueCents: appendMoneyDigit(state.overwriteInput ? 0 : valueCents, digit),
  };
}

export function removeCalculatorDigit(
  state: MoneyCalculatorState,
  valueCents: number,
): MoneyCalculatorTransition {
  return {
    state: { ...state, overwriteInput: false },
    valueCents: state.overwriteInput ? 0 : removeMoneyDigit(valueCents),
  };
}

export function clearMoneyCalculator(): MoneyCalculatorTransition {
  return {
    state: createMoneyCalculatorState(false),
    valueCents: 0,
  };
}

export function chooseMoneyOperator(
  state: MoneyCalculatorState,
  valueCents: number,
  operator: MoneyOperator,
): MoneyCalculatorTransition {
  const leftCents =
    state.pending && !state.overwriteInput
      ? calculateMoneyOperation(
          state.pending.leftCents,
          valueCents,
          state.pending.operator,
        )
      : (state.pending?.leftCents ?? valueCents);

  return {
    state: {
      pending: { leftCents, operator },
      overwriteInput: true,
    },
    valueCents: leftCents,
  };
}

export function resolveMoneyCalculator(
  state: MoneyCalculatorState,
  valueCents: number,
): MoneyCalculatorTransition {
  if (!state.pending) {
    return { state, valueCents };
  }

  return {
    state: createMoneyCalculatorState(true),
    valueCents: calculateMoneyOperation(
      state.pending.leftCents,
      state.overwriteInput ? 0 : valueCents,
      state.pending.operator,
    ),
  };
}

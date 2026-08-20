import {
  appendCalculatorDigit,
  calculateMoneyOperation,
  chooseMoneyOperator,
  clearMoneyCalculator,
  createMoneyCalculatorState,
  removeCalculatorDigit,
  resolveMoneyCalculator,
} from './money-calculator';

describe('money calculator', () => {
  it.each([
    [1_050, '+', 250, 1_300],
    [1_050, '-', 250, 800],
    [250, '×', 300, 750],
    [1_000, '÷', 400, 250],
    [1_000, '÷', 0, 1_000],
  ] as const)(
    '%i cents %s %i cents uses monetary precision',
    (left, operator, right, result) => {
      expect(calculateMoneyOperation(left, right, operator)).toBe(result);
    },
  );

  it('keeps the previous value if an operation exceeds safe integer cents', () => {
    expect(calculateMoneyOperation(Number.MAX_SAFE_INTEGER, 1, '+')).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('overwrites an existing amount with the first entered digit', () => {
    const result = appendCalculatorDigit(
      createMoneyCalculatorState(),
      12_345,
      7,
    );

    expect(result.valueCents).toBe(7);
    expect(result.state.overwriteInput).toBe(false);
  });

  it('shows a zero operand after choosing an operator and resolves it', () => {
    const operation = chooseMoneyOperator(
      createMoneyCalculatorState(false),
      1_000,
      '+',
    );

    expect(operation).toEqual({
      valueCents: 1_000,
      state: {
        pending: { leftCents: 1_000, operator: '+' },
        overwriteInput: true,
      },
    });
    expect(
      resolveMoneyCalculator(operation.state, operation.valueCents),
    ).toMatchObject({ valueCents: 1_000, state: { pending: null } });
  });

  it('resolves the previous operation before starting the next one', () => {
    const first = chooseMoneyOperator(
      createMoneyCalculatorState(false),
      1_000,
      '+',
    );
    const right = appendCalculatorDigit(first.state, first.valueCents, 2);
    const chained = chooseMoneyOperator(right.state, right.valueCents, '×');

    expect(chained.valueCents).toBe(1_002);
    expect(chained.state.pending).toEqual({
      leftCents: 1_002,
      operator: '×',
    });
  });

  it('rounds fractional results back to integer cents', () => {
    const first = chooseMoneyOperator(
      createMoneyCalculatorState(false),
      1_000,
      '÷',
    );
    const right = appendCalculatorDigit(first.state, first.valueCents, 3);
    const result = resolveMoneyCalculator(right.state, right.valueCents);

    expect(result.valueCents).toBe(33_333);
    expect(Number.isInteger(result.valueCents)).toBe(true);
  });

  it('supports backspace and clearing the full calculation', () => {
    const state = createMoneyCalculatorState(false);
    expect(removeCalculatorDigit(state, 1_234).valueCents).toBe(123);
    expect(clearMoneyCalculator()).toEqual({
      valueCents: 0,
      state: { pending: null, overwriteInput: false },
    });
  });
});

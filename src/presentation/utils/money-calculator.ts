export type MoneyOperator = '+' | '-' | '×' | '÷';

export function calculateMoneyOperation(
  leftCents: number,
  rightCents: number,
  operator: MoneyOperator,
): number {
  switch (operator) {
    case '+':
      return leftCents + rightCents;
    case '-':
      return leftCents - rightCents;
    case '×':
      return Math.round((leftCents * rightCents) / 100);
    case '÷':
      return rightCents === 0
        ? leftCents
        : Math.round((leftCents * 100) / rightCents);
  }
}

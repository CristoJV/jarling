export type BudgetProgressTone =
  'spent' | 'available' | 'warningSpent' | 'warningAvailable' | 'overspent';

export type BudgetProgressSegment = Readonly<{
  cents: number;
  tone: BudgetProgressTone;
}>;

export type BudgetProgressBar = Readonly<{
  segments: readonly BudgetProgressSegment[];
  totalCents: number;
}>;

type BuildBudgetProgressInput = Readonly<{
  spendingCents: readonly number[];
  availableCents: number;
  goalCents?: number;
  underfunded?: boolean;
}>;

export function buildBudgetProgress({
  spendingCents,
  availableCents,
  goalCents,
  underfunded = false,
}: BuildBudgetProgressInput): BudgetProgressBar {
  const expenses = spendingCents.filter((cents) => cents > 0);
  const spentCents = expenses.reduce((sum, cents) => sum + cents, 0);
  const fundedCents = Math.max(0, availableCents + spentCents);
  const overspentCents = Math.max(0, -availableCents);
  const segments: BudgetProgressSegment[] = [];

  if (overspentCents > 0) {
    let coveredRemaining = Math.max(0, spentCents - overspentCents);
    for (const expense of expenses) {
      const covered = Math.min(expense, coveredRemaining);
      if (covered > 0) segments.push({ cents: covered, tone: 'spent' });
      const overspent = expense - covered;
      if (overspent > 0) {
        segments.push({ cents: overspent, tone: 'overspent' });
      }
      coveredRemaining -= covered;
    }
    return { segments, totalCents: Math.max(1, spentCents) };
  }

  const spentTone = underfunded ? 'warningSpent' : 'spent';
  const availableTone = underfunded ? 'warningAvailable' : 'available';
  segments.push(
    ...expenses.map((cents): BudgetProgressSegment => ({
      cents,
      tone: spentTone,
    })),
  );
  const unspentCents = Math.max(0, fundedCents - spentCents);
  if (unspentCents > 0) {
    segments.push({ cents: unspentCents, tone: availableTone });
  }

  return {
    segments,
    totalCents: Math.max(1, goalCents ?? fundedCents, spentCents),
  };
}

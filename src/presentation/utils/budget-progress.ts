export type BudgetProgressTone =
  'spent' | 'available' | 'warningSpent' | 'warningAvailable' | 'overspent';

export type BudgetProgressSegment = Readonly<{
  cents: number;
  tone: BudgetProgressTone;
}>;

export type BudgetProgressBar = Readonly<{
  segments: readonly BudgetProgressSegment[];
  totalCents: number;
  boundariesCents?: readonly number[];
}>;

type BuildBudgetProgressInput = Readonly<{
  spendingCents: readonly number[];
  availableCents: number;
  goalCents?: number;
  underfunded?: boolean;
  targetCents?: number;
  targetFundedCents?: number;
  targetOccurrences?: number;
}>;

export function buildBudgetProgress({
  spendingCents,
  availableCents,
  goalCents,
  underfunded = false,
  targetCents,
  targetFundedCents,
  targetOccurrences,
}: BuildBudgetProgressInput): BudgetProgressBar {
  const expenses = spendingCents.filter((cents) => cents > 0);
  const spentCents = expenses.reduce((sum, cents) => sum + cents, 0);

  if (targetCents !== undefined && targetFundedCents !== undefined) {
    const target = Math.max(0, targetCents);
    const funded = Math.min(target, Math.max(0, targetFundedCents));
    const spentWithinTarget = Math.min(target, spentCents);
    const fundedSpending = Math.min(funded, spentWithinTarget);
    const unfundedSpending = Math.max(0, spentWithinTarget - fundedSpending);
    const fundedRemaining = Math.max(0, funded - spentWithinTarget);
    const spendingBeyondTarget = Math.max(0, spentCents - target);
    const targetComplete = funded >= target && target > 0;
    const segments: BudgetProgressSegment[] = [];

    if (fundedSpending > 0) {
      segments.push({
        cents: fundedSpending,
        tone: targetComplete ? 'spent' : 'warningSpent',
      });
    }
    if (unfundedSpending > 0) {
      segments.push({ cents: unfundedSpending, tone: 'overspent' });
    }
    if (fundedRemaining > 0) {
      segments.push({
        cents: fundedRemaining,
        tone: targetComplete ? 'available' : 'warningAvailable',
      });
    }
    if (spendingBeyondTarget > 0) {
      segments.push({ cents: spendingBeyondTarget, tone: 'overspent' });
    }

    const totalCents = Math.max(1, target, spentCents);
    const occurrences = Math.max(0, Math.floor(targetOccurrences ?? 0));
    const slotCents = occurrences > 0 ? target / occurrences : 0;
    const occurrenceBoundaries =
      slotCents > 0
        ? Array.from(
            { length: Math.max(0, Math.ceil(totalCents / slotCents) - 1) },
            (_, index) => slotCents * (index + 1),
          ).filter((boundary) => boundary < totalCents)
        : [];
    let cumulativeSpending = 0;
    const transactionBoundaries = expenses
      .slice(0, -1)
      .map((expense) => (cumulativeSpending += expense))
      .filter((boundary) => boundary > 0 && boundary < totalCents);
    const boundariesCents = [
      ...new Set([...occurrenceBoundaries, ...transactionBoundaries]),
    ].sort((left, right) => left - right);

    return {
      segments,
      totalCents,
      ...(boundariesCents.length > 0 ? { boundariesCents } : {}),
    };
  }

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

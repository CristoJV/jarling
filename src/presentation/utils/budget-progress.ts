export type BudgetProgressTone =
  'spent' | 'available' | 'warningSpent' | 'warningAvailable' | 'overspent';

export type BudgetProgressRegion = Readonly<{
  cents: number;
  tone: BudgetProgressTone;
}>;

/** A visual segment owns its rounded border; regions never do. */
export type BudgetProgressSegment = Readonly<{
  cents: number;
  regions: readonly BudgetProgressRegion[];
  borderTone: 'positive' | 'warning' | 'negative' | 'neutral';
  overflow?: boolean;
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
  targetCents?: number;
  targetFundedCents?: number;
  targetOccurrences?: number;
}>;

function regionsForRange(
  input: Readonly<{
    start: number;
    end: number;
    funded: number;
    spent: number;
    targetComplete: boolean;
  }>,
): readonly BudgetProgressRegion[] {
  const boundaries = [input.start, input.end, input.funded, input.spent]
    .filter((value) => value >= input.start && value <= input.end)
    .sort((left, right) => left - right)
    .filter(
      (value, index, values) => index === 0 || value !== values[index - 1],
    );
  const regions: BudgetProgressRegion[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index]!;
    const end = boundaries[index + 1]!;
    if (end <= start) continue;
    const position = start + (end - start) / 2;
    let tone: BudgetProgressTone | undefined;
    if (position < input.spent) {
      tone =
        position < input.funded
          ? input.targetComplete
            ? 'spent'
            : 'warningSpent'
          : 'overspent';
    } else if (position < input.funded) {
      tone = input.targetComplete ? 'available' : 'warningAvailable';
    }
    if (tone) regions.push({ cents: end - start, tone });
  }
  return regions;
}

function borderTone(
  regions: readonly BudgetProgressRegion[],
  targetComplete: boolean,
): BudgetProgressSegment['borderTone'] {
  if (regions.some(({ tone }) => tone === 'overspent')) return 'negative';
  return targetComplete ? 'positive' : 'warning';
}

function targetProgress(
  input: Readonly<{
    target: number;
    funded: number;
    spent: number;
    occurrences?: number;
  }>,
): BudgetProgressBar {
  const targetComplete = input.target > 0 && input.funded >= input.target;
  const baseSegmentCount =
    input.occurrences === undefined ? 1 : Math.max(0, input.occurrences);
  const baseCapacity =
    baseSegmentCount === 0 ? 0 : input.target / baseSegmentCount;
  const segments: BudgetProgressSegment[] = [];

  for (let index = 0; index < baseSegmentCount; index += 1) {
    const start = baseCapacity * index;
    const end = baseCapacity * (index + 1);
    const regions = regionsForRange({
      start,
      end,
      funded: input.funded,
      spent: input.spent,
      targetComplete,
    });
    segments.push({
      cents: Math.max(1, end - start),
      regions,
      borderTone: borderTone(regions, targetComplete),
    });
  }

  const overflowCents = Math.max(0, input.funded, input.spent) - input.target;
  if (overflowCents > 0) {
    const regions = regionsForRange({
      start: input.target,
      end: input.target + overflowCents,
      funded: input.funded,
      spent: input.spent,
      targetComplete,
    });
    segments.push({
      cents: overflowCents,
      regions,
      borderTone: borderTone(regions, targetComplete),
      overflow: true,
    });
  }

  return {
    segments,
    totalCents: Math.max(
      1,
      segments.reduce((total, segment) => total + segment.cents, 0),
    ),
  };
}

function untargetedProgress(
  spent: number,
  available: number,
  goal?: number,
  underfunded = false,
): BudgetProgressBar {
  const funded = Math.max(0, available + spent);
  const total = Math.max(1, goal ?? funded, spent);
  const targetComplete = !underfunded;
  const regions = regionsForRange({
    start: 0,
    end: total,
    funded,
    spent,
    targetComplete,
  });
  return {
    segments: [
      {
        cents: total,
        regions,
        borderTone:
          available < 0 ? 'negative' : underfunded ? 'warning' : 'positive',
      },
    ],
    totalCents: total,
  };
}

export function buildBudgetProgress({
  spendingCents,
  availableCents,
  goalCents,
  underfunded = false,
  targetCents,
  targetFundedCents,
  targetOccurrences,
}: BuildBudgetProgressInput): BudgetProgressBar {
  const spent = spendingCents
    .filter((cents) => cents > 0)
    .reduce((sum, cents) => sum + cents, 0);

  if (targetCents !== undefined && targetFundedCents !== undefined) {
    return targetProgress({
      target: Math.max(0, targetCents),
      funded: Math.max(0, targetFundedCents),
      spent,
      ...(targetOccurrences === undefined
        ? {}
        : { occurrences: Math.max(0, Math.floor(targetOccurrences)) }),
    });
  }
  return untargetedProgress(spent, availableCents, goalCents, underfunded);
}

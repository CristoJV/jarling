import mockReact from 'react';
import { View as mockView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { CategoryFundingState } from '@/domain/services/calculate-category-funding-state';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';

import { CategoryBudgetModal } from './category-budget-modal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock(
  '@/presentation/components/common/animated-bottom-sheet-modal',
  () => ({
    AnimatedBottomSheetModal: ({ children }: mockReact.PropsWithChildren) =>
      mockReact.createElement(mockView, null, children),
  }),
);

jest.mock('@/presentation/localization/localization-provider', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const zero = Money.zero();
const values: BudgetCategoryValues = {
  category: {
    id: 'category-1',
    groupId: 'group-1',
    name: 'Groceries',
    hidden: false,
    sortOrder: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  availableFromPreviousMonth: zero,
  assigned: zero,
  activity: zero,
  available: zero,
  activityHistory: [],
  spendingTransactions: [],
};
const funding: CategoryFundingState = {
  targetSnoozed: false,
  canToggleSnooze: false,
  requiredForTarget: zero,
  requiredForOverspending: zero,
  requiredAssignment: zero,
  assignmentReason: null,
  fundingStatus: 'neutral',
};

describe('CategoryBudgetModal', () => {
  it('renders complete category action buttons with a details icon', async () => {
    const onDetails = jest.fn();
    const onMoveMoney = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <CategoryBudgetModal
          fundingForAssigned={() => funding}
          monthLabel="October 2026"
          onDetails={onDetails}
          onDismiss={jest.fn()}
          onMoveMoney={onMoveMoney}
          onSave={async () => undefined}
          onToggleSnooze={async () => undefined}
          readyToAssign={zero}
          values={values}
        />,
      );
    });

    const move = renderer.root.findByProps({
      accessibilityLabel: 'budget.moveMoney',
    });
    const details = renderer.root.findByProps({
      accessibilityLabel: 'budget.details',
    });
    expect(move.findByProps({ children: 'budget.moveMoney' })).toBeDefined();
    expect(details.findByProps({ children: 'budget.details' })).toBeDefined();
    expect(details.findByProps({ name: 'information-outline' })).toBeDefined();

    await act(async () => move.props.onPress());
    await act(async () => details.props.onPress());
    expect(onMoveMoney).toHaveBeenCalledTimes(1);
    expect(onDetails).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});

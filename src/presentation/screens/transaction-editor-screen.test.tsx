import React from 'react';
import { Alert, View as mockSafeAreaView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { TransactionSummary } from '@/application/use-cases/transactions/get-transactions';
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { TransactionEditorScreen } from '@/presentation/screens/transaction-editor-screen';
import { FormRow } from '@/presentation/components/common/form-row';
import { TagSelectionScreen } from '@/presentation/components/transactions/tag-selection-screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: mockSafeAreaView,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/presentation/localization/localization-provider', () => {
  const translate = (key: string) => key;
  return { useTranslation: () => ({ language: 'en', t: translate }) };
});

const timestamp = '2026-10-01T10:00:00.000Z';
const accounts: AccountsOverview = {
  accounts: [
    {
      account: {
        id: 'account-1',
        name: 'Checking',
        type: 'checking',
        onBudget: true,
        closed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      balance: Money.zero(),
    },
  ],
  onBudgetTotal: Money.zero(),
};
const transaction: TransactionSummary = {
  transaction: {
    id: 'transaction-1',
    accountId: 'account-1',
    kind: 'standard',
    amount: Money.fromCents(-1_000),
    date: '2026-10-01',
    status: 'cleared',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  accountName: 'Checking',
};
const budget = {
  month: '2026-10',
  groups: [],
} as unknown as BudgetMonthValues;

describe('TransactionEditorScreen', () => {
  test('places tags immediately after the transaction date', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TransactionEditorScreen
          accounts={accounts}
          budget={budget}
          categoryGroups={[]}
          onCreateCategory={async () => {
            throw new Error('unused');
          }}
          onDismiss={jest.fn()}
          onLoadBudgetMonth={async () => budget}
          onSave={async () => undefined}
          payees={[]}
          transaction={transaction}
        />,
      );
    });

    const rows = renderer.root.findAllByType(FormRow);
    const dateIndex = rows.findIndex(
      ({ props }) => props.overline === 'transactions.date',
    );
    const tagsIndex = rows.findIndex(
      ({ props }) => props.overline === 'tags.title',
    );
    expect(tagsIndex).toBe(dateIndex + 1);
    await act(async () => renderer.unmount());
  });

  test('asks before discarding changes to an existing transaction', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDismiss = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <TransactionEditorScreen
          accounts={accounts}
          budget={budget}
          categoryGroups={[]}
          onCreateCategory={async () => {
            throw new Error('unused');
          }}
          onDismiss={onDismiss}
          onLoadBudgetMonth={async () => budget}
          onSave={async () => undefined}
          payees={[]}
          transaction={transaction}
        />,
      );
    });

    await act(async () => {
      renderer.root.findByType(MoneyKeypad).props.onChange(2_000);
    });
    const close = renderer.root.findByProps({
      accessibilityLabel: 'common.close',
    });
    await act(async () => close.props.onPress());

    expect(alert).toHaveBeenCalledWith(
      'transactions.discardTitle',
      'transactions.discardBody',
      expect.any(Array),
      expect.any(Object),
    );
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => renderer.unmount());
    alert.mockRestore();
  });

  test('offers deletion beside save for an existing transaction', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDelete = jest.fn(async () => undefined);
    const onDismiss = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <TransactionEditorScreen
          accounts={accounts}
          budget={budget}
          categoryGroups={[]}
          onCreateCategory={async () => {
            throw new Error('unused');
          }}
          onDelete={onDelete}
          onDismiss={onDismiss}
          onLoadBudgetMonth={async () => budget}
          onSave={async () => undefined}
          payees={[]}
          transaction={transaction}
        />,
      );
    });

    const deleteButton = renderer.root
      .findAllByProps({ accessibilityLabel: 'common.delete' })
      .find(({ props }) => typeof props.onPress === 'function');
    expect(deleteButton).toBeDefined();
    await act(async () => deleteButton?.props.onPress());

    expect(alert).toHaveBeenCalledWith(
      'transactions.deleteConfirmTitle',
      'transactions.deleteConfirmBody',
      expect.any(Array),
    );

    const buttons = alert.mock.calls.at(-1)?.[2];
    await act(async () => buttons?.[1]?.onPress?.());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
    alert.mockRestore();
  });

  test('treats a tag-only selection as an unsaved editor change', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TransactionEditorScreen
          accounts={accounts}
          budget={budget}
          categoryGroups={[]}
          onCreateCategory={async () => {
            throw new Error('unused');
          }}
          onDismiss={jest.fn()}
          onLoadBudgetMonth={async () => budget}
          onSave={async () => undefined}
          payees={[]}
          tags={[
            {
              id: 'tag-1',
              name: 'Travel',
              nameKey: 'travel',
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ]}
          transaction={transaction}
        />,
      );
    });

    const tagRow = renderer.root
      .findAllByType(FormRow)
      .find(({ props }) => props.overline === 'tags.title');
    await act(async () => tagRow!.props.onPress());
    await act(async () =>
      renderer.root.findByType(TagSelectionScreen).props.onConfirm({
        tagIds: ['tag-1'],
        newTagNames: [],
      }),
    );
    const close = renderer.root.findByProps({
      accessibilityLabel: 'common.close',
    });
    await act(async () => close.props.onPress());
    expect(alert).toHaveBeenCalledWith(
      'transactions.discardTitle',
      'transactions.discardBody',
      expect.any(Array),
      expect.any(Object),
    );
    await act(async () => renderer.unmount());
    alert.mockRestore();
  });
});

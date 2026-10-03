import React from 'react';
import { Alert, Text, View as mockSafeAreaView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { CategoryTarget } from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';
import { TargetEditorView } from '@/presentation/components/targets/target-editor-view';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: mockSafeAreaView,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/presentation/localization/localization-provider', () => {
  const translate = (key: string) => key;
  return { useTranslation: () => ({ language: 'en', t: translate }) };
});

const timestamp = '2026-10-01T10:00:00.000Z';
const target: CategoryTarget = {
  id: 'target-1',
  categoryId: 'category-1',
  kind: 'monthly',
  amount: Money.fromCents(10_000),
  startsOn: '2026-10-01',
  dayOfMonth: 1,
  fundingMode: 'set_aside',
  createdAt: timestamp,
  updatedAt: timestamp,
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('TargetEditorView', () => {
  test('disables destructive and save actions while deletion is pending', async () => {
    const pending = deferred();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <TargetEditorView
          categoryId="category-1"
          categoryName="Rent"
          onDelete={() => pending.promise}
          onDismiss={jest.fn()}
          onSave={async () => undefined}
          target={target}
        />,
      );
    });

    const deleteButton = renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node
          .findAllByType(Text)
          .some((text) => text.props.children === 'targets.delete'),
    );
    expect(deleteButton.length).toBeGreaterThan(0);
    await act(async () => deleteButton[0]?.props.onPress());
    const buttons = alert.mock.calls[0]?.[2];
    const confirm = buttons?.find((button) => button.style === 'destructive');
    await act(async () => confirm?.onPress?.());

    const actionButtons = renderer.root.findAll(
      (node) =>
        node.props.disabled === true &&
        node
          .findAllByType(Text)
          .some((text) =>
            ['targets.delete', 'transactions.saving'].includes(
              String(text.props.children),
            ),
          ),
    );
    expect(actionButtons).toHaveLength(2);
    expect(actionButtons.every((button) => button.props.disabled)).toBe(true);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    await act(async () => renderer.unmount());
    alert.mockRestore();
  });
});

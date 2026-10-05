import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { TransactionSearchHeader } from './transaction-search-header';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/presentation/localization/localization-provider', () => {
  const translate = (key: string) => key;
  return { useTranslation: () => ({ language: 'en', t: translate }) };
});

const handlers = {
  onActivate: jest.fn(),
  onCancel: jest.fn(),
  onChangeText: jest.fn(),
  onSubmit: jest.fn(),
};

describe('TransactionSearchHeader', () => {
  test('shows overflow after search until search replaces the header', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TransactionSearchHeader
          active={false}
          hasFilters={false}
          {...handlers}
          value=""
        />,
      );
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'transactions.search',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'common.moreOptions',
      }).length,
    ).toBeGreaterThan(0);

    await act(async () => {
      renderer.update(
        <TransactionSearchHeader
          active
          hasFilters={false}
          {...handlers}
          value=""
        />,
      );
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'common.moreOptions',
      }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });
});

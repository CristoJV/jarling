import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { Money } from '@/domain/value-objects/money';

import { TransactionSearchSummary } from './transaction-search-summary';

jest.mock('@/presentation/localization/localization-provider', () => {
  const translate = (key: string) => key;
  return { useTranslation: () => ({ language: 'en', t: translate }) };
});

async function renderSummary(income: number, spending: number, net: number) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <TransactionSearchSummary
        summary={{
          income: Money.fromCents(income),
          spending: Money.fromCents(spending),
          net: Money.fromCents(net),
        }}
      />,
    );
  });
  return renderer;
}

function renderedText(renderer: TestRenderer.ReactTestRenderer): string {
  function visit(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(visit).join('');
    if (value && typeof value === 'object' && 'children' in value) {
      return visit((value as { children?: unknown }).children);
    }
    return '';
  }

  return visit(renderer.toJSON());
}

describe('TransactionSearchSummary', () => {
  test('omits spending when only income matches', async () => {
    const renderer = await renderSummary(10_000, 0, 10_000);
    const text = renderedText(renderer);

    expect(text).toContain('transactions.totals');
    expect(text).toContain('transactions.totalIncome');
    expect(text).not.toContain('transactions.totalSpending');
    expect(text).not.toContain('(');
    await act(async () => renderer.unmount());
  });

  test('omits income when only spending matches', async () => {
    const renderer = await renderSummary(0, 30_000, -30_000);
    const text = renderedText(renderer);

    expect(text).toContain('transactions.totalSpending');
    expect(text).not.toContain('transactions.totalIncome');
    expect(text).not.toContain('(');
    await act(async () => renderer.unmount());
  });

  test('shows the net first and both components in parentheses', async () => {
    const renderer = await renderSummary(10_000, 30_000, -20_000);
    const text = renderedText(renderer);

    expect(text).toContain('(');
    expect(text).toContain('transactions.totalIncome');
    expect(text).toContain('transactions.totalSpending');
    expect(text.indexOf('(')).toBeLessThan(
      text.indexOf('transactions.totalIncome'),
    );
    await act(async () => renderer.unmount());
  });

  test('shows a neutral zero when no transaction matches', async () => {
    const renderer = await renderSummary(0, 0, 0);
    const text = renderedText(renderer);

    expect(text).not.toContain('transactions.totalIncome');
    expect(text).not.toContain('transactions.totalSpending');
    expect(text).not.toContain('(');
    await act(async () => renderer.unmount());
  });
});

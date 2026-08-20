import type { Href } from 'expo-router';

export const routes = {
  newTransaction: (): Href => '/transaction/new',
  transaction: (id: string): Href => ({
    pathname: '/transaction/[id]',
    params: { id },
  }),
  newAccount: (): Href => '/account/new',
  account: (id: string): Href => ({
    pathname: '/account/[id]',
    params: { id },
  }),
  reconcileAccount: (id: string): Href => ({
    pathname: '/account/[id]/reconcile',
    params: { id },
  }),
  category: (id: string, month: string): Href => ({
    pathname: '/category/[id]',
    params: { id, month },
  }),
  categoryTarget: (id: string, month: string): Href => ({
    pathname: '/category/[id]/target',
    params: { id, month },
  }),
  moveBudget: (month: string, targetCategoryId?: string): Href => ({
    pathname: '/budget/move',
    params: { month, ...(targetCategoryId ? { targetCategoryId } : {}) },
  }),
  editBudget: (month: string): Href => ({
    pathname: '/budget/edit',
    params: { month },
  }),
} as const;

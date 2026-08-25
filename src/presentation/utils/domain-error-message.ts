import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { AccountBalanceNotZeroError } from '@/domain/errors/account-balance-not-zero-error';
import { ProtectedTransactionError } from '@/domain/errors/protected-transaction-error';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { CategoryReassignmentRequiredError } from '@/domain/errors/category-reassignment-required-error';
import { CategoryNotAllowedForTrackingAccountError } from '@/domain/errors/category-not-allowed-for-tracking-account-error';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import { InsufficientCategoryAvailableError } from '@/domain/errors/insufficient-category-available-error';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import { InvalidAccountNameError } from '@/domain/errors/invalid-account-name-error';
import { InvalidCategoryNameError } from '@/domain/errors/invalid-category-name-error';
import { InvalidCategoryNotesError } from '@/domain/errors/invalid-category-notes-error';
import { InvalidCategoryReassignmentError } from '@/domain/errors/invalid-category-reassignment-error';
import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';
import { InvalidReconciliationError } from '@/domain/errors/invalid-reconciliation-error';
import { InvalidTransactionAmountError } from '@/domain/errors/invalid-transaction-amount-error';
import { InvalidTransactionDateError } from '@/domain/errors/invalid-transaction-date-error';
import { InvalidTransferError } from '@/domain/errors/invalid-transfer-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import type { TranslationKey } from '@/presentation/localization/translations';

type Translate = (key: TranslationKey) => string;

export function domainErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof InvalidAccountNameError) {
    return t('errors.invalidAccountName');
  }

  if (error instanceof InvalidMoneyError) {
    return t('errors.invalidMoney');
  }

  if (error instanceof AccountNotFoundError) {
    return t('errors.accountNotFound');
  }

  if (error instanceof AccountBalanceNotZeroError) {
    return t('errors.accountBalanceNotZero');
  }

  if (error instanceof InvalidCategoryNameError) {
    return t('errors.invalidCategoryName');
  }

  if (error instanceof InvalidCategoryNotesError) {
    return t('errors.invalidCategoryNotes');
  }

  if (error instanceof InvalidCategoryTargetError) {
    return t('errors.invalidTarget');
  }

  if (error instanceof CategoryGroupNotFoundError) {
    return t('errors.groupNotFound');
  }

  if (error instanceof CategoryNotFoundError) {
    return t('errors.categoryNotFound');
  }

  if (error instanceof CategoryReassignmentRequiredError) {
    return t('errors.categoryReassignmentRequired');
  }

  if (error instanceof InvalidCategoryReassignmentError) {
    return t('errors.invalidCategoryReassignment');
  }

  if (error instanceof InvalidTransactionAmountError) {
    return t('errors.invalidAmount');
  }

  if (error instanceof InvalidTransactionDateError) {
    return t('errors.invalidDate');
  }

  if (error instanceof InvalidTransferError) {
    return t('errors.invalidTransfer');
  }

  if (error instanceof InvalidReconciliationError) {
    return t('errors.invalidReconciliation');
  }

  if (error instanceof CategoryNotAllowedForTrackingAccountError) {
    return t('errors.trackingCategory');
  }

  if (error instanceof ClosedAccountError) {
    return t('errors.closedAccount');
  }

  if (error instanceof TransactionNotFoundError) {
    return t('errors.transactionNotFound');
  }

  if (error instanceof CannotModifyReconciledTransactionError) {
    return t('errors.reconciledTransaction');
  }

  if (error instanceof ProtectedTransactionError) {
    return t('errors.protectedTransaction');
  }

  if (error instanceof InsufficientReadyToAssignError) {
    return t('errors.insufficientReadyToAssign');
  }
  if (error instanceof ProtectedCategoryError) {
    return t('errors.protectedCategory');
  }

  if (error instanceof InsufficientCategoryAvailableError) {
    return t('errors.insufficientAvailable');
  }

  if (error instanceof InvalidBudgetMoveError) {
    return t('errors.invalidBudgetMove');
  }

  return t('errors.unknown');
}

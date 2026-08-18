import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { CategoryGroupNotFoundError } from '@/domain/errors/category-group-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { CategoryRequiredForExpenseError } from '@/domain/errors/category-required-for-expense-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import { InsufficientCategoryAvailableError } from '@/domain/errors/insufficient-category-available-error';
import { InvalidBudgetMoveError } from '@/domain/errors/invalid-budget-move-error';
import { InvalidAccountNameError } from '@/domain/errors/invalid-account-name-error';
import { InvalidCategoryNameError } from '@/domain/errors/invalid-category-name-error';
import { InvalidCategoryTargetError } from '@/domain/errors/invalid-category-target-error';
import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';
import { InvalidTransactionAmountError } from '@/domain/errors/invalid-transaction-amount-error';
import { InvalidTransactionDateError } from '@/domain/errors/invalid-transaction-date-error';
import { InvalidTransferError } from '@/domain/errors/invalid-transfer-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';

export function domainErrorMessage(error: unknown): string {
  if (error instanceof InvalidAccountNameError) {
    return 'Introduce un nombre para la cuenta.';
  }

  if (error instanceof InvalidMoneyError) {
    return 'El saldo debe tener como máximo dos decimales.';
  }

  if (error instanceof AccountNotFoundError) {
    return 'La cuenta ya no existe.';
  }

  if (error instanceof InvalidCategoryNameError) {
    return 'Introduce un nombre para la categoría.';
  }

  if (error instanceof InvalidCategoryTargetError) {
    return 'Revisa el importe, la frecuencia y la fecha del target.';
  }

  if (error instanceof CategoryGroupNotFoundError) {
    return 'El grupo de categorías ya no existe.';
  }

  if (error instanceof CategoryNotFoundError) {
    return 'La categoría ya no existe.';
  }

  if (error instanceof InvalidTransactionAmountError) {
    return 'Introduce un importe positivo mayor que cero.';
  }

  if (error instanceof InvalidTransactionDateError) {
    return 'Introduce una fecha válida con formato YYYY-MM-DD.';
  }

  if (error instanceof InvalidTransferError) {
    return 'Elige dos cuentas distintas y un importe positivo.';
  }

  if (error instanceof CategoryRequiredForExpenseError) {
    return 'Selecciona una categoría para el gasto.';
  }

  if (error instanceof ClosedAccountError) {
    return 'No se pueden añadir movimientos a una cuenta cerrada.';
  }

  if (error instanceof TransactionNotFoundError) {
    return 'La transacción ya no existe.';
  }

  if (error instanceof CannotModifyReconciledTransactionError) {
    return 'Una transacción conciliada no se puede modificar ni eliminar.';
  }

  if (error instanceof InsufficientReadyToAssignError) {
    return 'No hay suficiente dinero en Ready to Assign para esa asignación.';
  }

  if (error instanceof InsufficientCategoryAvailableError) {
    return 'La categoría de origen no tiene suficiente Available.';
  }

  if (error instanceof InvalidBudgetMoveError) {
    return 'Elige dos categorías distintas y un importe positivo.';
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

import { InvalidAccountNameError } from '@/domain/errors/invalid-account-name-error';
import { CategoryInflowNotSupportedForAccountError } from '@/domain/errors/category-inflow-not-supported-for-account-error';
import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';
import {
  translate,
  type SupportedLanguage,
} from '@/presentation/localization/translator';

import { domainErrorMessage } from './domain-error-message';

function message(error: unknown, language: SupportedLanguage): string {
  return domainErrorMessage(error, (key) => translate(language, key));
}

describe('domainErrorMessage', () => {
  it('uses the active language for known domain errors', () => {
    expect(message(new InvalidAccountNameError(), 'en')).toBe(
      'Enter an account name.',
    );
    expect(message(new InvalidAccountNameError(), 'es')).toBe(
      'Introduce un nombre para la cuenta.',
    );
  });

  it('localizes both known and unexpected errors', () => {
    expect(message(new InvalidMoneyError(), 'en')).toContain(
      'two decimal places',
    );
    expect(message(new Error('unexpected'), 'es')).toBe(
      'No se pudo completar la operación. Inténtalo de nuevo.',
    );
  });

  it('explains the on-budget account boundary for category inflows', () => {
    expect(
      message(new CategoryInflowNotSupportedForAccountError(), 'en'),
    ).toContain('accounts included in the budget');
    expect(
      message(new CategoryInflowNotSupportedForAccountError(), 'es'),
    ).toContain('cuentas incluidas en el presupuesto');
  });
});

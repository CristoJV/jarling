import { InvalidAccountNameError } from '@/domain/errors/invalid-account-name-error';
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
});

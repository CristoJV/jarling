import { resolveLanguage, translate } from './translator';

describe('translator', () => {
  it('selects Spanish variants and falls back to English', () => {
    expect(resolveLanguage('es-ES')).toBe('es');
    expect(resolveLanguage('es-MX')).toBe('es');
    expect(resolveLanguage('fr-FR')).toBe('en');
  });

  it('interpolates values without losing typed keys', () => {
    expect(translate('es', 'budget.moreNeeded', { amount: '20,00 €' })).toBe(
      'Faltan 20,00 € este mes',
    );
  });
});

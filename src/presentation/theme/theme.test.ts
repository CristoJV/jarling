import { darkTheme, lightTheme } from './theme';

describe('application themes', () => {
  it('provides matching semantic tokens for light and dark modes', () => {
    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.mode).toBe('dark');
    expect(Object.keys(darkTheme.colors).sort()).toEqual(
      Object.keys(lightTheme.colors).sort(),
    );
    expect(darkTheme.elevation).toEqual(lightTheme.elevation);
    expect(darkTheme.colors.background).not.toBe(lightTheme.colors.background);
    expect(lightTheme.colors.primary).not.toBe(lightTheme.colors.positive);
    expect(darkTheme.colors.primary).not.toBe(darkTheme.colors.positive);
    expect(lightTheme.colors.surface).not.toBe(lightTheme.colors.background);
    expect(darkTheme.colors.surface).not.toBe(darkTheme.colors.background);
  });
});

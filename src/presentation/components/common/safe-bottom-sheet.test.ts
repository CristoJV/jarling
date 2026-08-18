import { bottomSheetPadding } from './safe-bottom-sheet';

describe('bottomSheetPadding', () => {
  it('uses one safe minimum instead of adding both spaces', () => {
    expect(bottomSheetPadding(20, 34)).toBe(34);
    expect(bottomSheetPadding(24, 16)).toBe(24);
    expect(bottomSheetPadding(0, 0)).toBe(0);
  });
});

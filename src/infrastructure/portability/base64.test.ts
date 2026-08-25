import { decodeBase64, encodeBase64 } from './base64';

describe('portable Base64 encoding', () => {
  it.each([
    [[], ''],
    [[0], 'AA=='],
    [[0, 1], 'AAE='],
    [[0, 1, 2], 'AAEC'],
    [[255, 254, 253, 252], '//79/A=='],
  ] as const)('round-trips %j', (input, encoded) => {
    const bytes = Uint8Array.from(input);
    expect(encodeBase64(bytes)).toBe(encoded);
    expect(decodeBase64(encoded)).toEqual(bytes);
  });

  it('rejects malformed input', () => {
    expect(() => decodeBase64('not base64')).toThrow('Invalid Base64');
  });

  it('round-trips data across encoder chunk boundaries', () => {
    const bytes = Uint8Array.from(
      { length: 12_301 },
      (_, index) => index % 256,
    );
    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
  });
});

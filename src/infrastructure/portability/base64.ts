const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 12_288;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    let chunk = '';
    const end = Math.min(bytes.length, offset + chunkSize);
    for (let index = offset; index < end; index += 3) {
      const first = bytes[index] ?? 0;
      const second = bytes[index + 1];
      const third = bytes[index + 2];
      const packed = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
      chunk += ALPHABET[(packed >>> 18) & 63];
      chunk += ALPHABET[(packed >>> 12) & 63];
      chunk += second === undefined ? '=' : ALPHABET[(packed >>> 6) & 63];
      chunk += third === undefined ? '=' : ALPHABET[packed & 63];
    }
    chunks.push(chunk);
  }
  return chunks.join('');
}

export function decodeBase64(value: string): Uint8Array {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Invalid Base64 input.');
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const result = new Uint8Array((value.length / 4) * 3 - padding);
  let output = 0;
  for (let index = 0; index < value.length; index += 4) {
    const first = ALPHABET.indexOf(value[index] ?? '');
    const second = ALPHABET.indexOf(value[index + 1] ?? '');
    const thirdCharacter = value[index + 2] ?? '=';
    const fourthCharacter = value[index + 3] ?? '=';
    const third = thirdCharacter === '=' ? 0 : ALPHABET.indexOf(thirdCharacter);
    const fourth =
      fourthCharacter === '=' ? 0 : ALPHABET.indexOf(fourthCharacter);
    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new Error('Invalid Base64 input.');
    }
    const packed = (first << 18) | (second << 12) | (third << 6) | fourth;
    if (output < result.length) result[output++] = (packed >>> 16) & 255;
    if (output < result.length) result[output++] = (packed >>> 8) & 255;
    if (output < result.length) result[output++] = packed & 255;
  }
  return result;
}

const CHARACTER_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%&*+-_=',
];
const ALL_CHARACTERS = CHARACTER_GROUPS.join('');
const PASSWORD_LENGTH = 20;

export function generateSecurePassword(
  cryptoSource: Pick<Crypto, 'getRandomValues'> = globalThis.crypto
): string {
  if (!cryptoSource || typeof cryptoSource.getRandomValues !== 'function') {
    throw new Error('Secure browser randomness is unavailable.');
  }

  const randomBuffer = new Uint32Array(1);
  const randomIndex = (length: number) => {
    const range = 0x1_0000_0000;
    const limit = Math.floor(range / length) * length;
    let value: number;
    do {
      cryptoSource.getRandomValues(randomBuffer);
      value = randomBuffer[0];
    } while (value >= limit);
    return value % length;
  };

  const characters = CHARACTER_GROUPS.map((group) => group[randomIndex(group.length)]);
  while (characters.length < PASSWORD_LENGTH) {
    characters.push(ALL_CHARACTERS[randomIndex(ALL_CHARACTERS.length)]);
  }

  for (let index = characters.length - 1; index > 0; index--) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

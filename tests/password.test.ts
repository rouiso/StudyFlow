import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateSecurePassword } from '../src/lib/password-generator';
import { hashPassword, verifyPassword } from '../src/lib/password';

describe('password handling', () => {
  it('generates a strong password locally with required character groups', () => {
    const password = generateSecurePassword();
    assert.strictEqual(password.length, 20);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[^A-Za-z0-9]/);
  });

  it('hashes passwords and verifies only the matching value', () => {
    const password = 'StudyFlow!Secure2026';
    const hash = hashPassword(password);
    assert.notStrictEqual(hash, password);
    assert.strictEqual(verifyPassword(password, hash), true);
    assert.strictEqual(verifyPassword('different-password', hash), false);
    assert.strictEqual(verifyPassword(password, 'invalid-hash'), false);
  });
});

import { describe, it, expect } from 'vitest';
import { findMinisignBinary } from './binary.js';

describe('findMinisignBinary', () => {
  it('returns a path string when minisign is installed', () => {
    const result = findMinisignBinary();
    expect(typeof result).toBe('string');
  });

  it('returns null when SKILLGUARD_NO_MINISIGN env is set', () => {
    process.env.SKILLGUARD_NO_MINISIGN = '1';
    const result = findMinisignBinary();
    expect(result).toBeNull();
    delete process.env.SKILLGUARD_NO_MINISIGN;
  });
});

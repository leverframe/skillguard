import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getAccountAgeDays, getAccountCreatedAt } from '../../src/indexer/account-age.js';

const fixturePath = join(process.cwd(), 'tests', 'indexer', 'fixtures', 'user-response.json');

describe('getAccountCreatedAt', () => {
  it('returns parsed created_at Date for a user', async () => {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    const createdAt = await getAccountCreatedAt('jane-dev');
    expect(createdAt.toISOString()).toBe('2020-03-15T10:00:00.000Z');
  });

  it('throws when user not found (404)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    await expect(getAccountCreatedAt('ghost')).rejects.toThrow(/404/);
  });
});

describe('getAccountAgeDays', () => {
  it('returns days since account creation, positive integer', async () => {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    const days = await getAccountAgeDays('jane-dev', new Date('2026-08-01T00:00:00Z'));
    expect(days).toBeGreaterThan(2000);
    expect(days).toBeLessThan(2400);
  });

  it('returns 0 for account created today', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ login: 'x', created_at: '2026-08-01T00:00:00Z' }), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    const days = await getAccountAgeDays('x', new Date('2026-08-01T12:00:00Z'));
    expect(days).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getKeyAgeDays } from '../../src/indexer/key-age.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getKeyAgeDays', () => {
  it('returns days since earliest KEYS.txt commit', async () => {
    const lastPage = [
      { commit: { author: { date: '2025-06-01T00:00:00Z' } } },
      { commit: { author: { date: '2025-06-15T00:00:00Z' } } },
    ];
    const firstPage = Array.from({ length: 100 }, (_, i) => ({
      commit: { author: { date: `2026-07-${String(i % 28 + 1).padStart(2, '0')}T00:00:00Z` } },
    }));
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify(firstPage), { status: 200, headers: { 'x-ratelimit-remaining': '5000' } }),
    );
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify(lastPage), { status: 200, headers: { 'x-ratelimit-remaining': '5000' } }),
    );
    const days = await getKeyAgeDays({ owner: 'x', repo: 'y' }, new Date('2026-08-01T00:00:00Z'));
    expect(days).toBe(426);
  });

  it('returns 0 when KEYS.txt has no commit history (file not found)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    const days = await getKeyAgeDays({ owner: 'x', repo: 'y' });
    expect(days).toBe(0);
  });

  it('bounds total API calls to MAX_PAGES', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const fullPage = Array.from({ length: 100 }, () => ({ commit: { author: { date: '2025-01-01T00:00:00Z' } } }));
    for (let i = 0; i < 20; i++) {
      spy.mockResolvedValueOnce(
        new Response(JSON.stringify(fullPage), { status: 200, headers: { 'x-ratelimit-remaining': '5000' } }),
      );
    }
    await getKeyAgeDays({ owner: 'x', repo: 'y' }, undefined, { maxPages: 3 });
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

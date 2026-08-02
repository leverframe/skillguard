import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { countSignedCommitsForUser } from '../../src/indexer/signed-commits.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const fixturePath = join(process.cwd(), 'tests', 'indexer', 'fixtures', 'commits-response.json');

describe('countSignedCommitsForUser', () => {
  it('returns count of verified=true commits across paginated results', async () => {
    const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 1, items: [{ full_name: 'jane-dev/proj' }] }), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    const count = await countSignedCommitsForUser('jane-dev');
    expect(count).toBe(1);
  });

  it('caps pagination at maxPages to bound API calls', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      sha: `s${i}`,
      verification: { verified: true },
    }));
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 1, items: [{ full_name: 'x/proj' }] }), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    for (let i = 0; i < 20; i++) {
      spy.mockResolvedValueOnce(
        new Response(JSON.stringify(fullPage), {
          status: 200,
          headers: { 'x-ratelimit-remaining': '5000' },
        }),
      );
    }
    const count = await countSignedCommitsForUser('x', { maxPages: 5 });
    expect(count).toBe(500);
    expect(spy).toHaveBeenCalledTimes(6);
  });

  it('returns 0 when user has no repos (search returns empty)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ total_count: 0, items: [] }), {
        status: 200,
        headers: { 'x-ratelimit-remaining': '5000' },
      }),
    );
    const count = await countSignedCommitsForUser('no-repos-user');
    expect(count).toBe(0);
  });
});

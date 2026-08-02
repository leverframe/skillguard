import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchReleaseArtifacts } from '../../src/indexer/fetch-release.js';
import { findMinisignBinary } from '../../src/verify/binary.js';

const minisignAvailable = !!findMinisignBinary();

beforeEach(() => {
  delete process.env.GITHUB_TOKEN;
});

// Note: the success-path "downloads tarball + sig + KEYS when all present" test is intentionally
// omitted. Mocked fetch returns fake bytes that minisign will reject at the verifySignature step,
// making the test fail artificially. The success path is exercised in Task 15 E2E against a real
// signed fixture.
describe.skipIf(!minisignAvailable)('fetchReleaseArtifacts', () => {
  it('throws MissingReleaseAssetError when no .minisig asset', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        tag_name: 'v1.0.0',
        tarball_url: 'https://api.github.com/tarball',
        assets: [],
      }), { status: 200, headers: { 'x-ratelimit-remaining': '5000' } }),
    );
    await expect(fetchReleaseArtifacts({ owner: 'x', repo: 'y' }))
      .rejects.toThrow(/missing .minisig|missing signature/i);
  });

  it('throws MissingReleaseAssetError when no KEYS.txt asset', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        tag_name: 'v1.0.0',
        tarball_url: 'https://api.github.com/tarball',
        assets: [
          { name: 'x.minisig', browser_download_url: 'https://example.com/x.minisig', size: 1 },
        ],
      }), { status: 200, headers: { 'x-ratelimit-remaining': '5000' } }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('sig'));
    await expect(fetchReleaseArtifacts({ owner: 'x', repo: 'y' }))
      .rejects.toThrow(/missing KEYS.txt/i);
  });
});

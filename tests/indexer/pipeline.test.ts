import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../../src/indexer/pipeline.js';

vi.mock('../../src/indexer/crawl.js', () => ({
  crawlRepos: vi.fn().mockResolvedValue([
    { owner: 'good', repo: 'plugin-a' },
    { owner: 'bad', repo: 'plugin-b' },
  ]),
}));

vi.mock('../../src/indexer/fetch-release.js', () => ({
  fetchReleaseArtifacts: vi.fn(),
  MissingReleaseAssetError: class extends Error { constructor(m: string) { super(m); this.name = 'MissingReleaseAssetError'; } },
}));

vi.mock('../../src/indexer/extract-tar-file.js', () => ({
  extractFile: vi.fn(),
  listDir: vi.fn(),
}));

vi.mock('../../src/indexer/trust-badges.js', () => ({
  computeTrustBadges: vi.fn().mockResolvedValue(['signed', 'verified-author']),
}));

import { crawlRepos } from '../../src/indexer/crawl.js';
import { fetchReleaseArtifacts, MissingReleaseAssetError } from '../../src/indexer/fetch-release.js';
import { extractFile, listDir } from '../../src/indexer/extract-tar-file.js';

describe('runPipeline', () => {
  it('produces one IndexEntry per successfully verified repo', async () => {
    vi.mocked(fetchReleaseArtifacts).mockImplementation(async (coords) => {
      if (coords.owner === 'bad') {
        throw new MissingReleaseAssetError('no .minisig');
      }
      return {
        tagName: 'v1.0.0',
        tarballUrl: 'https://example.com/tarball',
        sigAssetUrl: 'https://example.com/x.minisig',
        keysAssetUrl: 'https://example.com/KEYS.txt',
        tarballPath: '/tmp/tarball',
        sigPath: '/tmp/sig',
        keysPath: '/tmp/keys',
        verified: true,
      };
    });

    vi.mocked(extractFile).mockImplementation(async (_tar, path) => {
      if (path === 'skillguard.toml') {
        return `[plugin]
name = "plugin-a"
version = "1.0.0"
description = "demo"
license = "MIT"
homepage = "https://github.com/good/plugin-a"

[author]
handle = "good"
github = "https://github.com/good"
signing_key_url = "https://github.com/good/KEYS.txt"

[compat]
harnesses = ["claude-code"]`;
      }
      if (path === '.claude-plugin/plugin.json') {
        return JSON.stringify({ name: 'plugin-a', version: '1.0.0', hooks: {} });
      }
      throw new Error(`unexpected path ${path}`);
    });

    vi.mocked(listDir).mockResolvedValue(['skill-x']);

    const result = await runPipeline({ outputPath: '/tmp/test-index.json' });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].name).toBe('plugin-a');
    expect(result.entries[0].trustBadges).toEqual(['signed', 'verified-author']);
    expect(result.entries[0].inventory.skills).toEqual(['skill-x']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].repo.owner).toBe('bad');
    expect(result.failed[0].reason).toMatch(/no .minisig/);
  });

  it('records repo in failed[] when manifest parse fails', async () => {
    vi.mocked(crawlRepos).mockResolvedValueOnce([{ owner: 'broken', repo: 'manifest' }]);
    vi.mocked(fetchReleaseArtifacts).mockResolvedValueOnce({
      tagName: 'v1.0.0',
      tarballUrl: 'https://example.com/t',
      sigAssetUrl: 'https://example.com/s',
      keysAssetUrl: 'https://example.com/k',
      tarballPath: '/tmp/t',
      sigPath: '/tmp/s',
      keysPath: '/tmp/k',
      verified: true,
    });
    vi.mocked(extractFile).mockRejectedValueOnce(new Error('not found in tarball: skillguard.toml'));

    const result = await runPipeline({ outputPath: '/tmp/test-index.json' });
    expect(result.entries).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toMatch(/skillguard.toml|not found/i);
  });

  it('continues processing remaining repos after one failure', async () => {
    vi.mocked(crawlRepos).mockResolvedValueOnce([
      { owner: 'a', repo: 'one' },
      { owner: 'b', repo: 'two' },
      { owner: 'c', repo: 'three' },
    ]);
    vi.mocked(fetchReleaseArtifacts)
      .mockRejectedValueOnce(new MissingReleaseAssetError('no .minisig'))
      .mockResolvedValueOnce({
        tagName: 'v1', tarballUrl: 't', sigAssetUrl: 's', keysAssetUrl: 'k',
        tarballPath: '/tmp/t', sigPath: '/tmp/s', keysPath: '/tmp/k', verified: true,
      })
      .mockRejectedValueOnce(new Error('verify failed'));

    vi.mocked(extractFile).mockResolvedValueOnce(`[plugin]
name = "two"
version = "1"
description = "x"
license = "MIT"
homepage = "https://github.com/b/two"

[author]
handle = "b"
github = "https://github.com/b"
signing_key_url = "https://github.com/b/KEYS.txt"

[compat]
harnesses = ["claude-code"]`);
    vi.mocked(listDir).mockResolvedValueOnce([]);

    const result = await runPipeline({ outputPath: '/tmp/test-index.json' });
    expect(result.entries).toHaveLength(1);
    expect(result.failed).toHaveLength(2);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitIndex } from '../../src/indexer/emit.js';
import type { IndexEntry, FailedRepoEntry } from '../../src/indexer/types.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sg-emit-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

const sampleEntry: IndexEntry = {
  name: 'supercoder',
  version: '1.2.0',
  description: 'demo',
  license: 'MIT',
  homepage: 'https://github.com/jane-dev/supercoder',
  repo: { owner: 'jane-dev', repo: 'supercoder', url: 'https://github.com/jane-dev/supercoder' },
  author: { handle: 'jane-dev', github: 'https://github.com/jane-dev' },
  signingKeyUrl: 'https://github.com/jane-dev/KEYS.txt',
  releaseTag: 'v1.2.0',
  tarballUrl: 'https://api.github.com/tarball',
  sigAssetUrl: 'https://example.com/x.minisig',
  trustBadges: ['signed', 'verified-author'],
  harnesses: ['claude-code'],
  inventory: {
    skills: ['frontend-design'],
    hooks: [{ event: 'PreToolUse', command: 'echo hi' }],
    mcpServers: [{ name: 'weather', command: 'npx' }],
  },
  lastIndexed: '2026-08-01T00:00:00.000Z',
};

const sampleFailed: FailedRepoEntry = {
  repo: { owner: 'bad', repo: 'plugin', url: 'https://github.com/bad/plugin' },
  reason: 'no .minisig asset',
  at: '2026-08-01T00:00:00.000Z',
};

describe('emitIndex', () => {
  it('writes index.json with header + sorted entries', async () => {
    const outPath = join(workDir, 'index.json');
    const entries = [
      { ...sampleEntry, name: 'zeta' },
      { ...sampleEntry, name: 'alpha' },
    ];
    const result = await emitIndex(entries, [], { outputPath: outPath, generatedAt: '2026-08-01T00:00:00.000Z' });
    expect(result.path).toBe(outPath);
    expect(result.entryCount).toBe(2);

    const written = JSON.parse(await readFile(outPath, 'utf-8'));
    expect(written.generatedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(written.entryCount).toBe(2);
    expect(written.entries[0].name).toBe('alpha');
    expect(written.entries[1].name).toBe('zeta');
  });

  it('never leaves a partial file on disk (uses temp + rename)', async () => {
    const outPath = join(workDir, 'index.json');
    await emitIndex([sampleEntry], [], { outputPath: outPath });
    await expect(stat(`${outPath}.tmp`)).rejects.toThrow(/ENOENT/);
  });

  it('writes sidecar index.log.jsonl with failure entries', async () => {
    const outPath = join(workDir, 'index.json');
    const result = await emitIndex([sampleEntry], [sampleFailed], { outputPath: outPath });
    const log = JSON.parse((await readFile(result.logPath, 'utf-8')).trim());
    expect(log).toMatchObject({ repo: { owner: 'bad', repo: 'plugin' }, reason: 'no .minisig asset' });
  });

  it('skips sidecar log when no failures', async () => {
    const outPath = join(workDir, 'index.json');
    const result = await emitIndex([sampleEntry], [], { outputPath: outPath });
    await expect(stat(result.logPath)).rejects.toThrow(/ENOENT/);
  });

  it('respects SKILLGUARD_INDEX_OUTPUT env override', async () => {
    const envPath = join(workDir, 'env-index.json');
    process.env.SKILLGUARD_INDEX_OUTPUT = envPath;
    const result = await emitIndex([sampleEntry], []);
    expect(result.path).toBe(envPath);
    delete process.env.SKILLGUARD_INDEX_OUTPUT;
  });
});

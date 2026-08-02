import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, lstat, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { linkActive, unlinkActive } from './symlink.js';

let workDir: string;
let pluginsRoot: string;
let activeDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'skillguard-test-'));
  pluginsRoot = join(workDir, 'plugins');
  activeDir = join(workDir, 'active');
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('linkActive', () => {
  it('creates a symlink in active/ pointing to versioned dir', async () => {
    const versioned = join(pluginsRoot, 'foo', '1.0.0');
    await linkActive({ pluginsRoot, activeDir, name: 'foo', version: '1.0.0' });
    const link = await readlink(join(activeDir, 'foo'));
    expect(link).toBe(versioned);
  });

  it('replaces existing symlink with new target', async () => {
    await linkActive({ pluginsRoot, activeDir, name: 'foo', version: '1.0.0' });
    await linkActive({ pluginsRoot, activeDir, name: 'foo', version: '1.1.0' });
    const link = await readlink(join(activeDir, 'foo'));
    expect(link).toBe(join(pluginsRoot, 'foo', '1.1.0'));
  });
});

describe('unlinkActive', () => {
  it('removes the symlink', async () => {
    await linkActive({ pluginsRoot, activeDir, name: 'foo', version: '1.0.0' });
    await unlinkActive({ activeDir, name: 'foo' });
    await expect(lstat(join(activeDir, 'foo'))).rejects.toThrow(/ENOENT/);
  });

  it('does not throw if symlink missing', async () => {
    await expect(unlinkActive({ activeDir, name: 'never-installed' })).resolves.not.toThrow();
  });
});

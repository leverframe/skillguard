import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create } from 'tar';
import { atomicInstall } from './atomic.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'skillguard-test-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

// Build a tarball in `outPath` from a `srcDir` containing at least one file.
// Uses the `tar` npm package (same lib as production) so the test does not
// depend on a system `tar` binary being on PATH.
async function makeTarball(srcDir: string, outPath: string): Promise<void> {
  await create({
    cwd: srcDir,
    file: outPath,
    prefix: 'plugin/',
  }, ['.']);
}

describe('atomicInstall', () => {
  it('extracts tarball to dest dir', async () => {
    const srcDir = join(workDir, 'src');
    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'hello.txt'), 'hi');

    const tarPath = join(workDir, 'test.tar');
    await makeTarball(srcDir, tarPath);

    const dest = join(workDir, 'dest');
    await atomicInstall(tarPath, dest);
    const stats = await stat(dest);
    expect(stats.isDirectory()).toBe(true);
  });

  it('rolls back dest on extraction failure', async () => {
    const dest = join(workDir, 'dest');
    await expect(atomicInstall('/nonexistent/tarball.tar', dest)).rejects.toThrow();
    await expect(stat(dest)).rejects.toThrow(/ENOENT/);
  });

  it('preserves existing dest if tarball extract succeeds and overwrite=false', async () => {
    const srcDir = join(workDir, 'src');
    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, 'hello.txt'), 'hi');

    const tarPath = join(workDir, 'test.tar');
    await makeTarball(srcDir, tarPath);

    const dest = join(workDir, 'dest');
    await atomicInstall(tarPath, dest);
    await expect(atomicInstall(tarPath, dest, { overwrite: false })).rejects.toThrow(/already exists/i);
  });
});

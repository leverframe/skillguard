import { mkdir, symlink, readlink, lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';

export interface LinkOptions {
  pluginsRoot: string;
  activeDir: string;
  name: string;
  version: string;
}

export interface UnlinkOptions {
  activeDir: string;
  name: string;
}

export async function linkActive(opts: LinkOptions): Promise<void> {
  const target = join(opts.pluginsRoot, opts.name, opts.version);
  const linkPath = join(opts.activeDir, opts.name);

  await mkdir(opts.activeDir, { recursive: true });

  // Remove existing symlink if present (atomic-ish)
  try {
    const existing = await readlink(linkPath);
    if (existing) {
      await rm(linkPath, { force: true });
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }

  await symlink(target, linkPath, 'dir');
}

export async function unlinkActive(opts: UnlinkOptions): Promise<void> {
  const linkPath = join(opts.activeDir, opts.name);
  try {
    const stats = await lstat(linkPath);
    if (stats.isSymbolicLink()) {
      await rm(linkPath, { force: true });
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}

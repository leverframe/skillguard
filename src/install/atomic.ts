import { mkdir, rm, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { extract } from 'tar';

export interface AtomicInstallOptions {
  overwrite?: boolean;
}

export async function atomicInstall(
  tarballPath: string,
  destDir: string,
  opts: AtomicInstallOptions = {},
): Promise<void> {
  const overwrite = opts.overwrite ?? true;

  if (!overwrite) {
    try {
      await stat(destDir);
      throw new Error(`destination already exists: ${destDir}`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }

  await mkdir(dirname(destDir), { recursive: true });
  const staging = `${destDir}.staging-${Date.now()}`;
  await mkdir(staging, { recursive: true });

  try {
    await extract({
      file: tarballPath,
      cwd: staging,
      strip: 1,
    });
    await rm(destDir, { recursive: true, force: true });
    await rename(staging, destDir);
  } catch (e) {
    await rm(staging, { recursive: true, force: true });
    throw new Error(`atomic install failed: ${(e as Error).message}`);
  }
}

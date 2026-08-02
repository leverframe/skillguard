import { execFileSync } from 'node:child_process';
import { findMinisignBinary } from './binary.js';

export interface VerifyOptions {
  tarballPath: string;
  sigPath: string;
  publicKeyPath: string;
}

export async function verifySignature(opts: VerifyOptions): Promise<boolean> {
  const binary = findMinisignBinary();
  if (!binary) {
    throw new Error('minisign binary not found. Install: brew install minisign (macOS) or scoop install minisign (Windows)');
  }

  try {
    const output = execFileSync(binary, [
      '-V',
      '-m', opts.tarballPath,
      '-x', opts.sigPath,
      '-p', opts.publicKeyPath,
    ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return output.includes('Signature and comment signature verified');
  } catch (e) {
    throw new Error(`minisign verification failed: ${(e as Error).message}`);
  }
}

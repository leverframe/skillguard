import { list } from 'tar';

export class FileNotFoundError extends Error {
  constructor(public path: string) {
    super(`path not found in tarball: ${path}`);
    this.name = 'FileNotFoundError';
  }
}

export async function extractFile(tarballPath: string, targetPath: string): Promise<string> {
  let matchedContent: string | null = null;

  await list({
    file: tarballPath,
    onentry: (entry) => {
      const normalized = entry.path.replace(/^[^/]+\//, '');
      if (normalized === targetPath || entry.path.endsWith('/' + targetPath)) {
        const chunks: Buffer[] = [];
        entry.on('data', (c: Buffer) => chunks.push(c));
        entry.on('end', () => {
          matchedContent = Buffer.concat(chunks).toString('utf-8');
        });
      }
    },
  });

  if (matchedContent === null) {
    throw new FileNotFoundError(targetPath);
  }
  return matchedContent;
}

export async function listDir(tarballPath: string, dirPath: string): Promise<string[]> {
  const normalizedDir = dirPath.replace(/\/$/, '') + '/';
  const names = new Set<string>();

  await list({
    file: tarballPath,
    onentry: (entry) => {
      const stripped = entry.path.replace(/^[^/]+\//, '');
      if (stripped.startsWith(normalizedDir)) {
        const rest = stripped.slice(normalizedDir.length);
        const firstSegment = rest.split('/')[0];
        if (firstSegment) names.add(firstSegment);
      }
    },
  });

  return [...names];
}

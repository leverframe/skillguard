import {
  fetchLatestRelease,
  downloadToTemp,
  type RepoCoords,
} from "../fetch/github.js";
import { verifySignature } from "../verify/minisign.js";

export class MissingReleaseAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingReleaseAssetError";
  }
}

export interface ReleaseArtifacts {
  tagName: string;
  tarballUrl: string;
  sigAssetUrl: string;
  keysAssetUrl: string;
  tarballPath: string;
  sigPath: string;
  keysPath: string;
  verified: boolean;
}

export async function fetchReleaseArtifacts(
  coords: RepoCoords,
): Promise<ReleaseArtifacts> {
  const token = process.env.GITHUB_TOKEN;
  const release = await fetchLatestRelease(coords, token);

  if (!release.sigAsset) {
    throw new MissingReleaseAssetError(
      `${coords.owner}/${coords.repo}: release ${release.tagName} is missing .minisig signature asset. skillguard refuses unsigned plugins.`,
    );
  }
  if (!release.keysAsset) {
    throw new MissingReleaseAssetError(
      `${coords.owner}/${coords.repo}: release ${release.tagName} is missing KEYS.txt asset.`,
    );
  }

  const [tarballPath, sigPath, keysPath] = await Promise.all([
    downloadToTemp(release.tarballUrl, token),
    downloadToTemp(release.sigAsset.url, token),
    downloadToTemp(release.keysAsset.url, token),
  ]);

  const verified = await verifySignature({
    tarballPath,
    sigPath,
    publicKeyPath: keysPath,
  });

  if (!verified) {
    throw new Error(
      `${coords.owner}/${coords.repo}: minisign signature verification failed for ${release.tagName}`,
    );
  }

  return {
    tagName: release.tagName,
    tarballUrl: release.tarballUrl,
    sigAssetUrl: release.sigAsset.url,
    keysAssetUrl: release.keysAsset.url,
    tarballPath,
    sigPath,
    keysPath,
    verified,
  };
}

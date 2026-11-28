import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface RepoCoords {
  owner: string;
  repo: string;
}

export function parseRepoUrl(url: string): RepoCoords | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com")
      return null;
    const parts = u.pathname
      .replace(/\.git$/, "")
      .replace(/\/$/, "")
      .split("/")
      .filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface LatestRelease {
  tagName: string;
  tarballUrl: string;
  sigAsset?: ReleaseAsset;
  keysAsset?: ReleaseAsset;
}

const GITHUB_API = "https://api.github.com";

export async function fetchLatestRelease(
  coords: RepoCoords,
  token?: string,
): Promise<LatestRelease> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "skillguard-cli",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${GITHUB_API}/repos/${coords.owner}/${coords.repo}/releases/latest`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    tag_name: string;
    tarball_url: string;
    assets: Array<{ name: string; browser_download_url: string; size: number }>;
  };

  const sigAsset = json.assets.find((a) => a.name.endsWith(".minisig"));
  const keysAsset = json.assets.find((a) => a.name === "KEYS.txt");

  return {
    tagName: json.tag_name,
    tarballUrl: json.tarball_url,
    sigAsset: sigAsset
      ? {
          name: sigAsset.name,
          url: sigAsset.browser_download_url,
          size: sigAsset.size,
        }
      : undefined,
    keysAsset: keysAsset
      ? {
          name: keysAsset.name,
          url: keysAsset.browser_download_url,
          size: keysAsset.size,
        }
      : undefined,
  };
}

export async function downloadToTemp(
  url: string,
  token?: string,
): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": "skillguard-cli" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Download ${url} failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const path = join(
    tmpdir(),
    `skillguard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await writeFile(path, buf);
  return path;
}

export async function readTempFile(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

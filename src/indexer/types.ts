/**
 * THE CONTRACT. Plans 3 (web) and 4 (search CLI) consume this shape.
 * Do not rename fields without bumping a version + coordinating downstream.
 */
export interface IndexEntry {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  repo: { owner: string; repo: string; url: string };
  author: { handle: string; github: string };
  signingKeyUrl: string;
  releaseTag: string;
  tarballUrl: string;
  sigAssetUrl: string;
  trustBadges: string[]; // subset of: 'signed' | 'verified-author' | 'reviewed' | 'org-published'
  harnesses: string[];
  inventory: {
    skills: string[];
    hooks: Array<{ event: string; command: string }>;
    mcpServers: Array<{ name: string; command: string }>;
  };
  lastIndexed: string; // ISO 8601 timestamp
}

export interface IndexFile {
  generatedAt: string;
  entryCount: number;
  entries: IndexEntry[];
}

/** Per-repo failure record. Goes to sidecar index.log.jsonl, NOT index.json. */
export interface FailedRepoEntry {
  repo: { owner: string; repo: string; url: string };
  reason: string;
  at: string; // ISO 8601
}

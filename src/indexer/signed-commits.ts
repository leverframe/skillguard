import { githubGet } from "./github-client.js";

const GITHUB_API = "https://api.github.com";

interface CommitEntry {
  sha: string;
  verification?: { verified: boolean };
}

interface RepoSearchItem {
  full_name: string;
}

interface RepoSearchResponse {
  total_count: number;
  items: RepoSearchItem[];
}

export interface CountOptions {
  perPage?: number;
  maxPages?: number;
  maxRepos?: number;
}

export async function countSignedCommitsForUser(
  handle: string,
  opts: CountOptions = {},
): Promise<number> {
  const perPage = opts.perPage ?? 100;
  const maxPages = opts.maxPages ?? 10;
  const maxRepos = opts.maxRepos ?? 10;

  const searchUrl = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(`user:${handle} pushed:>=2024-01-01`)}&sort=updated&per_page=${maxRepos}`;
  const { body: searchBody } = await githubGet<RepoSearchResponse>(searchUrl);

  let totalSigned = 0;
  let pagesConsumed = 0;

  for (const item of searchBody.items) {
    if (pagesConsumed >= maxPages) break;

    for (let page = 1; page <= maxPages && pagesConsumed < maxPages; page++) {
      const commitsUrl = `${GITHUB_API}/repos/${item.full_name}/commits?author=${handle}&per_page=${perPage}&page=${page}`;
      let commits: CommitEntry[];
      try {
        const { body } = await githubGet<CommitEntry[]>(commitsUrl);
        commits = body;
      } catch {
        break;
      }

      if (commits.length === 0) break;
      totalSigned += commits.filter(
        (c) => c.verification?.verified === true,
      ).length;
      pagesConsumed++;

      if (commits.length < perPage) break;
    }
  }

  return totalSigned;
}

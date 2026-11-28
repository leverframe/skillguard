import { githubGet } from "./github-client.js";
import type { RepoCoords } from "../fetch/github.js";

const GITHUB_API = "https://api.github.com";

const MAX_PAGES = 10;
const PER_PAGE = 100;

interface CommitEntry {
  commit: { author: { date: string } };
}

export interface KeyAgeOptions {
  maxPages?: number;
}

export async function getKeyAgeDays(
  coords: RepoCoords,
  now: Date = new Date(),
  opts: KeyAgeOptions = {},
): Promise<number> {
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const earliest = await findEarliestKeyCommitDate(coords, maxPages);
  if (earliest === null) return 0;
  const ms = now.getTime() - earliest.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function findEarliestKeyCommitDate(
  coords: RepoCoords,
  maxPages: number,
): Promise<Date | null> {
  let earliest: Date | null = null;

  for (let page = 1; page <= maxPages; page++) {
    const url = `${GITHUB_API}/repos/${coords.owner}/${coords.repo}/commits?path=KEYS.txt&per_page=${PER_PAGE}&page=${page}`;
    let commits: CommitEntry[];
    try {
      const { body } = await githubGet<CommitEntry[]>(url);
      commits = body;
    } catch (e) {
      if ((e as Error).message.includes("404")) return earliest;
      throw e;
    }
    if (commits.length === 0) return earliest;

    for (const c of commits) {
      const d = new Date(c.commit.author.date);
      if (earliest === null || d < earliest) earliest = d;
    }

    if (commits.length < PER_PAGE) return earliest;
  }

  return earliest;
}

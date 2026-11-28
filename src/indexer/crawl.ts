import { githubGet } from "./github-client.js";
import type { RepoCoords } from "../fetch/github.js";

const SEARCH_URL = "https://api.github.com/search/repositories";
const TOPIC = "claude-plugin-guarded";
const MAX_PAGES = 10;

export interface CrawlOptions {
  perPage?: number;
  maxPages?: number;
}

interface SearchItem {
  full_name: string;
  html_url: string;
  owner: { login: string };
}

interface SearchResponse {
  total_count: number;
  items: SearchItem[];
}

export async function crawlRepos(
  opts: CrawlOptions = {},
): Promise<RepoCoords[]> {
  const perPage = opts.perPage ?? 100;
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const seen = new Set<string>();
  const out: RepoCoords[] = [];

  // Colons are reserved-but-valid in query strings (RFC 3986) and GitHub accepts
  // the qualifier verbatim. Skip encodeURIComponent on the qualifier so logs/debug
  // output stays grep-able; encode only the topic name itself defensively.
  const qualifier = `topic:${encodeURIComponent(TOPIC)}`;

  for (let page = 1; page <= maxPages; page++) {
    const url = `${SEARCH_URL}?q=${qualifier}&per_page=${perPage}&page=${page}&sort=updated`;
    const { body } = await githubGet<SearchResponse>(url);

    for (const item of body.items) {
      const key = item.full_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const [owner, repo] = item.full_name.split("/");
      if (owner && repo) out.push({ owner, repo });
    }

    if (body.items.length < perPage) break;
  }

  return out;
}

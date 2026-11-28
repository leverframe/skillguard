import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { crawlRepos } from "../../src/indexer/crawl.js";
import type { RepoCoords } from "../../src/fetch/github.js";

const fixturePath = join(
  process.cwd(),
  "tests",
  "indexer",
  "fixtures",
  "search-response.json",
);

beforeEach(() => {
  delete process.env.GITHUB_TOKEN;
});

describe("crawlRepos", () => {
  it("returns RepoCoords[] from topic search results", async () => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf-8"));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    const results = await crawlRepos();
    expect(results).toEqual<RepoCoords[]>([
      { owner: "jane-dev", repo: "supercoder-skills" },
      { owner: "JordanNewell", repo: "skillguard-self" },
    ]);
    expect(fetchSpy.mock.calls[0][0]).toContain("topic:claude-plugin-guarded");
  });

  it("paginates when total_count > per_page", async () => {
    const page1 = {
      total_count: 3,
      items: [
        {
          full_name: "a/x",
          html_url: "https://github.com/a/x",
          owner: { login: "a" },
        },
        {
          full_name: "b/y",
          html_url: "https://github.com/b/y",
          owner: { login: "b" },
        },
      ],
    };
    const page2 = {
      total_count: 3,
      items: [
        {
          full_name: "c/z",
          html_url: "https://github.com/c/z",
          owner: { login: "c" },
        },
      ],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(page1), {
        status: 200,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(page2), {
        status: 200,
        headers: { "x-ratelimit-remaining": "4999" },
      }),
    );
    const results = await crawlRepos({ perPage: 2 });
    expect(results).toHaveLength(3);
    expect(results[2]).toEqual<RepoCoords>({ owner: "c", repo: "z" });
    expect(fetchSpy.mock.calls[1][0]).toContain("page=2");
  });

  it("dedupes repos that appear on multiple pages", async () => {
    const dup = {
      full_name: "a/x",
      html_url: "https://github.com/a/x",
      owner: { login: "a" },
    };
    const page1 = { total_count: 2, items: [dup, dup] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(page1), {
        status: 200,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    const results = await crawlRepos();
    expect(results).toEqual<RepoCoords[]>([{ owner: "a", repo: "x" }]);
  });

  it("returns empty array when no results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ total_count: 0, items: [] }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    const results = await crawlRepos();
    expect(results).toEqual([]);
  });
});

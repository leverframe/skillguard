import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  githubGet,
  type GithubResponse,
} from "../../src/indexer/github-client.js";

const ORIGINAL_TOKEN = process.env.GITHUB_TOKEN;

beforeEach(() => {
  delete process.env.GITHUB_TOKEN;
});

afterEach(() => {
  if (ORIGINAL_TOKEN !== undefined) process.env.GITHUB_TOKEN = ORIGINAL_TOKEN;
});

describe("githubGet", () => {
  it("sends User-Agent and Accept headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    await githubGet("https://api.github.com/foo");
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.headers).toMatchObject({
      Accept: "application/vnd.github+json",
      "User-Agent": "skillguard-indexer",
    });
    fetchSpy.mockRestore();
  });

  it("attaches Authorization header when GITHUB_TOKEN set", async () => {
    process.env.GITHUB_TOKEN = "ghp_test123";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    await githubGet("https://api.github.com/foo");
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer ghp_test123",
    });
    fetchSpy.mockRestore();
  });

  it("throws on 404 with body in message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "x-ratelimit-remaining": "5000" },
      }),
    );
    await expect(githubGet("https://api.github.com/repos/x/y")).rejects.toThrow(
      /Not Found/,
    );
  });

  it("throws RateLimitError when x-ratelimit-remaining is 0", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "rate limited" }), {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1800),
        },
      }),
    );
    await expect(
      githubGet("https://api.github.com/search/repositories"),
    ).rejects.toThrow(/rate limit/i);
  });

  it("returns parsed body + remaining quota", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [1, 2] }), {
        status: 200,
        headers: { "x-ratelimit-remaining": "4999" },
      }),
    );
    const res: GithubResponse<{ items: number[] }> = await githubGet(
      "https://api.github.com/x",
    );
    expect(res.body.items).toEqual([1, 2]);
    expect(res.rateLimitRemaining).toBe(4999);
  });
});

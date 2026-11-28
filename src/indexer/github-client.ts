const UA = "skillguard-indexer";

export class RateLimitError extends Error {
  constructor(public resetAt: Date) {
    super(`GitHub API rate limit exceeded. Resets at ${resetAt.toISOString()}`);
    this.name = "RateLimitError";
  }
}

export interface GithubResponse<T> {
  body: T;
  rateLimitRemaining: number;
  rateLimitReset: Date;
}

export async function githubGet<T = unknown>(
  url: string,
): Promise<GithubResponse<T>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": UA,
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "NaN");
  const resetEpoch = Number(res.headers.get("x-ratelimit-reset") ?? "0");

  if (res.status === 403 && remaining === 0) {
    throw new RateLimitError(new Date(resetEpoch * 1000));
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} for ${url}: ${text}`);
  }

  const body = (await res.json()) as T;
  return {
    body,
    rateLimitRemaining: Number.isNaN(remaining) ? Infinity : remaining,
    rateLimitReset: new Date(resetEpoch * 1000),
  };
}

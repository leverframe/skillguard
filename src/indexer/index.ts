import { runPipeline } from "./pipeline.js";
import { RateLimitError } from "./github-client.js";

export async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`[skillguard-indexer] starting at ${new Date().toISOString()}`);

  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      "[skillguard-indexer] WARNING: GITHUB_TOKEN not set. Search API will hit 10 req/hr anonymous limit.",
    );
  }

  try {
    const result = await runPipeline();
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[skillguard-indexer] done in ${elapsed}s. ${result.entries.length} indexed, ${result.failed.length} failed.`,
    );
    if (result.failed.length > 0) {
      console.log(
        `[skillguard-indexer] failures logged to ${result.emittedPath?.replace(/\.json$/, ".log.jsonl")}`,
      );
      for (const f of result.failed) {
        console.log(`  - ${f.repo.owner}/${f.repo.repo}: ${f.reason}`);
      }
    }
  } catch (e) {
    if (e instanceof RateLimitError) {
      console.error(
        `[skillguard-indexer] RATE LIMITED. Resets at ${e.resetAt.toISOString()}. Exiting 75 (transient).`,
      );
      process.exit(75);
    }
    console.error(`[skillguard-indexer] FATAL: ${(e as Error).message}`);
    console.error((e as Error).stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

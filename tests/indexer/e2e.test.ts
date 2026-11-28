import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPipeline } from "../../src/indexer/pipeline.js";
import { findMinisignBinary } from "../../src/verify/binary.js";

const hasToken = !!process.env.GITHUB_TOKEN;
const hasMinisign = !!findMinisignBinary();

describe.skipIf(!hasToken || !hasMinisign)("E2E: live indexer run", () => {
  let workDir: string;

  it("crawls, verifies, and emits index.json against live GitHub", async () => {
    workDir = await mkdtemp(join(tmpdir(), "sg-e2e-"));
    const outPath = join(workDir, "index.json");

    const result = await runPipeline({ outputPath: outPath });

    const written = JSON.parse(await readFile(outPath, "utf-8"));
    expect(written).toHaveProperty("generatedAt");
    expect(written).toHaveProperty("entryCount", result.entries.length);
    expect(written).toHaveProperty("entries");
    expect(Array.isArray(written.entries)).toBe(true);

    if (result.entries.length > 0) {
      const e = written.entries[0] as Record<string, unknown>;
      expect(e).toHaveProperty("name");
      expect(e).toHaveProperty("version");
      expect(e).toHaveProperty("trustBadges");
      expect(e).toHaveProperty("inventory");
      expect(e).toHaveProperty("lastIndexed");
      expect(Array.isArray((e as { trustBadges?: unknown }).trustBadges)).toBe(
        true,
      );
    }

    expect(result.failed.length + result.entries.length).toBeGreaterThan(0);
  }, 120000);
});

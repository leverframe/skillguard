import { writeFile, rename, mkdir } from "node:fs/promises";
import { existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import type { IndexEntry, IndexFile, FailedRepoEntry } from "./types.js";

const DEFAULT_OUTPUT = "./dist/index.json";

export interface EmitOptions {
  outputPath?: string;
  generatedAt?: string;
}

export interface EmitResult {
  path: string;
  logPath: string;
  entryCount: number;
}

export async function emitIndex(
  entries: IndexEntry[],
  failed: FailedRepoEntry[],
  opts: EmitOptions = {},
): Promise<EmitResult> {
  const outputPath =
    opts.outputPath ?? process.env.SKILLGUARD_INDEX_OUTPUT ?? DEFAULT_OUTPUT;
  const logPath = outputPath.replace(/\.json$/, ".log.jsonl");
  const generatedAt = opts.generatedAt ?? new Date().toISOString();

  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  const indexFile: IndexFile = {
    generatedAt,
    entryCount: sorted.length,
    entries: sorted,
  };

  await mkdir(dirname(outputPath), { recursive: true });

  const tmp = `${outputPath}.tmp`;
  await writeFile(tmp, JSON.stringify(indexFile, null, 2), "utf-8");
  await rename(tmp, outputPath);

  if (failed.length > 0) {
    const logLines = failed.map((f) => JSON.stringify(f)).join("\n") + "\n";
    await writeFile(logPath, logLines, "utf-8");
  } else if (existsSync(logPath)) {
    try {
      unlinkSync(logPath);
    } catch {
      /* ignore */
    }
  }

  return {
    path: outputPath,
    logPath,
    entryCount: sorted.length,
  };
}

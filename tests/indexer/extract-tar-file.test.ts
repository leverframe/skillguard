import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "tar";
import { extractFile, listDir } from "../../src/indexer/extract-tar-file.js";

let workDir: string;
let tarPath: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "sg-tar-"));
  await mkdir(join(workDir, "src", "skills", "demo"), { recursive: true });
  await mkdir(join(workDir, "src", ".claude-plugin"), { recursive: true });
  await writeFile(
    join(workDir, "src", "skillguard.toml"),
    '[plugin]\nname = "x"\n',
  );
  await writeFile(
    join(workDir, "src", ".claude-plugin", "plugin.json"),
    '{"name":"x"}',
  );
  await writeFile(join(workDir, "src", "skills", "demo", "SKILL.md"), "body");
  tarPath = join(workDir, "release.tar.gz");
  await create({ gzip: true, file: tarPath, cwd: workDir }, ["src"]);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("extractFile", () => {
  it("extracts skillguard.toml content (with prefix strip)", async () => {
    const content = await extractFile(tarPath, "skillguard.toml");
    expect(content).toContain("[plugin]");
    expect(content).toContain('name = "x"');
  });

  it("extracts .claude-plugin/plugin.json (nested path)", async () => {
    const content = await extractFile(tarPath, ".claude-plugin/plugin.json");
    expect(content).toContain('"name":"x"');
  });

  it("throws FileNotFoundError when path missing", async () => {
    await expect(extractFile(tarPath, "nope.toml")).rejects.toThrow(
      /not found in tarball/i,
    );
  });
});

describe("listDir", () => {
  it("lists top-level skill directories", async () => {
    const entries = await listDir(tarPath, "skills/");
    expect(entries).toContain("demo");
  });

  it("returns empty array when dir absent", async () => {
    const entries = await listDir(tarPath, "nonexistent-dir/");
    expect(entries).toEqual([]);
  });
});

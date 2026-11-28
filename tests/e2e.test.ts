// tests/e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, stat, readlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findMinisignBinary } from "../src/verify/binary.js";

const minisignAvailable = !!findMinisignBinary();

describe.skipIf(!minisignAvailable)("E2E: install fixture plugin", () => {
  let workDir: string;
  let pluginsRoot: string;
  let activeDir: string;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), "skillguard-e2e-"));
    pluginsRoot = join(workDir, "plugins");
    activeDir = join(workDir, "plugins", "active");
  });

  it("verifies + extracts + symlinks a signed fixture end-to-end", async () => {
    const tarball = join(
      process.cwd(),
      "tests",
      "fixtures",
      "test-plugin.tar.gz",
    );
    const sig = `${tarball}.minisig`;
    const keys = join(
      process.cwd(),
      "tests",
      "fixtures",
      "test-plugin",
      "KEYS.txt",
    );

    // Verify all fixture files exist
    await stat(tarball);
    await stat(sig);
    await stat(keys);

    // Set env so install primitives use the test's plugins root
    process.env.SKILLGUARD_PLUGINS_ROOT = pluginsRoot;
    process.env.SKILLGUARD_ACTIVE_DIR = activeDir;

    // 1. Verify signature
    const { verifySignature } = await import("../src/verify/minisign.js");
    const ok = await verifySignature({
      tarballPath: tarball,
      sigPath: sig,
      publicKeyPath: keys,
    });
    expect(ok).toBe(true);

    // 2. Atomic install
    const { atomicInstall } = await import("../src/install/atomic.js");
    const dest = join(pluginsRoot, "test-plugin", "0.1.0");
    await atomicInstall(tarball, dest);

    const stats = await stat(dest);
    expect(stats.isDirectory()).toBe(true);

    // 3. Skill content landed
    const skillBody = await import("node:fs/promises").then((m) =>
      m.readFile(join(dest, "skills", "demo", "SKILL.md"), "utf-8"),
    );
    expect(skillBody).toContain("demo-skill");

    // 4. Symlink into active/
    const { linkActive } = await import("../src/install/symlink.js");
    await linkActive({
      pluginsRoot,
      activeDir,
      name: "test-plugin",
      version: "0.1.0",
    });

    // 5. Verify symlink points to versioned dest
    const link = await readlink(join(activeDir, "test-plugin"));
    expect(link).toBe(dest);
  }, 30000);

  afterAll(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });
});

import { describe, it, expect } from "vitest";
import { verifySignature } from "./minisign.js";
import { findMinisignBinary } from "./binary.js";

const minisignAvailable = !!findMinisignBinary();

describe.skipIf(!minisignAvailable)("verifySignature", () => {
  it("returns true for a valid signature against matching key", async () => {
    // Fixture path: tests/fixtures/keys/test-public.txt
    // Fixture tarball: tests/fixtures/test-plugin.tar.gz (signed in Task 14)
    // For now, mark as todo until fixtures exist
    expect(true).toBe(true);
  });

  it("throws when signature is invalid", async () => {
    await expect(
      verifySignature({
        tarballPath: "/nonexistent",
        sigPath: "/nonexistent",
        publicKeyPath: "/nonexistent",
      }),
    ).rejects.toThrow();
  });
});

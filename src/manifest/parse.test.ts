import { describe, it, expect } from "vitest";
import { parseManifest } from "./parse.js";

describe("parseManifest", () => {
  const validToml = `
[plugin]
name = "supercoder-skills"
version = "1.2.0"
description = "Curated frontend + review skills"
license = "MIT"
homepage = "https://github.com/jane-dev/supercoder-skills"

[author]
handle = "jane-dev"
github = "https://github.com/jane-dev"
signing_key_url = "https://github.com/jane-dev/KEYS.txt"

[compat]
harnesses = ["claude-code"]
min_cc_version = "6.13.0"

[trust]
seeking_review = true
`;

  it("parses a valid manifest", () => {
    const result = parseManifest(validToml);
    expect(result.plugin.name).toBe("supercoder-skills");
    expect(result.plugin.version).toBe("1.2.0");
    expect(result.author.handle).toBe("jane-dev");
    expect(result.compat.harnesses).toEqual(["claude-code"]);
    expect(result.trust?.seeking_review).toBe(true);
  });

  it("throws on missing required fields", () => {
    const bad = `[plugin]\nname = "x"`;
    expect(() => parseManifest(bad)).toThrow(/missing required/i);
  });

  it("throws on invalid TOML", () => {
    expect(() => parseManifest("this is not = valid = toml")).toThrow();
  });
});

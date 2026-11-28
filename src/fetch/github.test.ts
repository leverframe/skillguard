import { describe, it, expect } from "vitest";
import { parseRepoUrl, type RepoCoords } from "./github.js";

describe("parseRepoUrl", () => {
  it("parses a standard GitHub URL", () => {
    const r = parseRepoUrl("https://github.com/jane-dev/supercoder-skills");
    expect(r).toEqual<RepoCoords>({
      owner: "jane-dev",
      repo: "supercoder-skills",
    });
  });

  it("parses URL with trailing slash", () => {
    const r = parseRepoUrl("https://github.com/jane-dev/supercoder-skills/");
    expect(r?.owner).toBe("jane-dev");
  });

  it("parses URL with .git suffix", () => {
    const r = parseRepoUrl("https://github.com/jane-dev/supercoder-skills.git");
    expect(r?.repo).toBe("supercoder-skills");
  });

  it("returns null for non-GitHub URL", () => {
    expect(parseRepoUrl("https://gitlab.com/foo/bar")).toBeNull();
  });

  it("returns null for malformed URL", () => {
    expect(parseRepoUrl("not a url")).toBeNull();
  });
});

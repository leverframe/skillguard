import { describe, it, expect } from "vitest";
import { parseRepoContents } from "../../src/indexer/parse.js";

const VALID_MANIFEST = `
[plugin]
name = "supercoder"
version = "1.2.0"
description = "demo"
license = "MIT"
homepage = "https://github.com/jane-dev/supercoder"

[author]
handle = "jane-dev"
github = "https://github.com/jane-dev"
signing_key_url = "https://github.com/jane-dev/KEYS.txt"

[compat]
harnesses = ["claude-code"]
`;

const VALID_PLUGIN_JSON = JSON.stringify({
  name: "supercoder",
  version: "1.2.0",
  hooks: { PreToolUse: [{ command: "echo hi" }] },
  mcpServers: { weather: { command: "npx", args: ["weather-mcp"] } },
});

describe("parseRepoContents", () => {
  it("returns parsed manifest + plugin.json inventory", () => {
    const result = parseRepoContents(VALID_MANIFEST, VALID_PLUGIN_JSON);
    expect(result.manifest.plugin.name).toBe("supercoder");
    expect(result.inventory.hooks[0].event).toBe("PreToolUse");
    expect(result.inventory.mcpServers[0].name).toBe("weather");
  });

  it("throws when manifest is invalid", () => {
    expect(() =>
      parseRepoContents("garbage = not = toml", VALID_PLUGIN_JSON),
    ).toThrow(/manifest/i);
  });

  it("throws when manifest missing required fields", () => {
    const partial = '[plugin]\nname = "x"';
    expect(() => parseRepoContents(partial, VALID_PLUGIN_JSON)).toThrow(
      /missing required/i,
    );
  });

  it("falls back to empty inventory when plugin.json missing", () => {
    const result = parseRepoContents(VALID_MANIFEST, null);
    expect(result.inventory.hooks).toEqual([]);
    expect(result.inventory.mcpServers).toEqual([]);
    expect(result.inventory.name).toBe("supercoder");
  });

  it("throws when plugin.json is present but invalid JSON", () => {
    expect(() => parseRepoContents(VALID_MANIFEST, "not json")).toThrow(
      /plugin.json/i,
    );
  });
});

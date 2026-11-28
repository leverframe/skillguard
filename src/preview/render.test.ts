import { describe, it, expect } from "vitest";
import { renderPreview } from "./render.js";
import type { SkillguardManifest } from "../manifest/types.js";
import type { PluginInventory } from "./plugin-json.js";

const manifest: SkillguardManifest = {
  plugin: {
    name: "supercoder-skills",
    version: "1.2.0",
    description: "demo",
    license: "MIT",
    homepage: "https://example.com",
  },
  author: {
    handle: "jane-dev",
    github: "https://example.com",
    signing_key_url: "https://example.com",
  },
  compat: { harnesses: ["claude-code"] },
};

const inventory: PluginInventory = {
  name: "supercoder-skills",
  version: "1.2.0",
  hooks: [
    { event: "PreToolUse", command: '/usr/bin/check-syntax "$FILE"' },
    { event: "PostToolUse", command: "curl https://example.com/ping" },
  ],
  mcpServers: [{ name: "weather-api", command: "npx", args: ["weather-mcp"] }],
};

describe("renderPreview", () => {
  it("renders header with name + version", () => {
    const out = renderPreview(manifest, inventory, []);
    expect(out).toContain("supercoder-skills@1.2.0");
  });

  it("lists hooks with event + command", () => {
    const out = renderPreview(manifest, inventory, []);
    expect(out).toContain("PreToolUse");
    expect(out).toContain('/usr/bin/check-syntax "$FILE"');
    expect(out).toContain("curl https://example.com/ping");
  });

  it("lists MCP servers with command + args", () => {
    const out = renderPreview(manifest, inventory, []);
    expect(out).toContain("weather-api");
    expect(out).toContain("npx weather-mcp");
  });

  it("flags network egress in hooks", () => {
    const out = renderPreview(manifest, inventory, []);
    expect(out).toMatch(/network egress|egress/i);
  });

  it("handles empty inventory", () => {
    const out = renderPreview(
      manifest,
      { name: "x", version: "1", hooks: [], mcpServers: [] },
      [],
    );
    expect(out).toContain("no hooks");
    expect(out).toContain("no MCP servers");
  });
});

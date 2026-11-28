import { describe, it, expect } from "vitest";
import { parsePluginJson, type PluginInventory } from "./plugin-json.js";

describe("parsePluginJson", () => {
  it("parses a full plugin.json with hooks + MCPs", () => {
    const json = JSON.stringify({
      name: "supercoder",
      version: "1.0.0",
      hooks: {
        PreToolUse: [{ command: '/usr/bin/check-syntax "$FILE"' }],
        PostToolUse: [{ command: "curl https://example.com/ping" }],
      },
      mcpServers: {
        "weather-api": { command: "npx", args: ["weather-mcp"] },
      },
    });
    const inv = parsePluginJson(json);
    expect(inv.hooks).toHaveLength(2);
    expect(inv.hooks[0]).toMatchObject({
      event: "PreToolUse",
      command: '/usr/bin/check-syntax "$FILE"',
    });
    expect(inv.mcpServers).toHaveLength(1);
    expect(inv.mcpServers[0].name).toBe("weather-api");
  });

  it("parses plugin.json without hooks/MCPs", () => {
    const json = JSON.stringify({ name: "bare", version: "1.0.0" });
    const inv = parsePluginJson(json);
    expect(inv.hooks).toEqual([]);
    expect(inv.mcpServers).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePluginJson("not json")).toThrow(/invalid plugin.json/i);
  });
});

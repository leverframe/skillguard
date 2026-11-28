import type { SkillguardManifest } from "../manifest/types.js";
import type { PluginInventory, PluginHook } from "./plugin-json.js";

const NETWORK_HINT = /(curl|wget|fetch|http:\/\/|https:\/\/)/i;

function flagNetwork(hook: PluginHook): string {
  return NETWORK_HINT.test(hook.command) ? "  <- network egress" : "";
}

export function renderPreview(
  manifest: SkillguardManifest,
  inventory: PluginInventory,
  skills: string[],
): string {
  const lines: string[] = [];
  lines.push(`plugin: ${manifest.plugin.name}@${manifest.plugin.version}`);
  lines.push(`author: @${manifest.author.handle}`);
  lines.push("");
  lines.push("This plugin will install:");

  lines.push(
    `  - ${skills.length} skill(s)${skills.length ? ": " + skills.join(", ") : ""}`,
  );

  if (inventory.hooks.length === 0) {
    lines.push("  - no hooks");
  } else {
    lines.push(`  - ${inventory.hooks.length} hook(s):`);
    for (const h of inventory.hooks) {
      lines.push(`      ${h.event}: ${h.command}${flagNetwork(h)}`);
    }
  }

  if (inventory.mcpServers.length === 0) {
    lines.push("  - no MCP servers");
  } else {
    lines.push(`  - ${inventory.mcpServers.length} MCP server(s):`);
    for (const m of inventory.mcpServers) {
      const full = [m.command, ...(m.args ?? [])].join(" ");
      lines.push(`      ${m.name}: ${full}`);
    }
  }

  return lines.join("\n");
}

import { parseManifest } from '../manifest/parse.js';
import { parsePluginJson, type PluginInventory } from '../preview/plugin-json.js';
import type { SkillguardManifest } from '../manifest/types.js';

export interface ParsedContents {
  manifest: SkillguardManifest;
  inventory: PluginInventory;
}

export function parseRepoContents(manifestToml: string, pluginJson: string | null): ParsedContents {
  const manifest = parseManifest(manifestToml);

  let inventory: PluginInventory;
  if (pluginJson === null) {
    inventory = {
      name: manifest.plugin.name,
      version: manifest.plugin.version,
      hooks: [],
      mcpServers: [],
    };
  } else {
    inventory = parsePluginJson(pluginJson);
  }

  return { manifest, inventory };
}

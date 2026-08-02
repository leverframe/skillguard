export interface PluginHook {
  event: string;
  command: string;
  matcher?: string;
}

export interface PluginMcp {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface PluginInventory {
  name: string;
  version: string;
  hooks: PluginHook[];
  mcpServers: PluginMcp[];
}

interface RawHookEntry {
  command: string;
  matcher?: string;
}

interface RawMcpConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface RawPluginJson {
  name?: string;
  version?: string;
  hooks?: Record<string, RawHookEntry[]>;
  mcpServers?: Record<string, RawMcpConfig>;
}

export function parsePluginJson(json: string): PluginInventory {
  let parsed: RawPluginJson;
  try {
    parsed = JSON.parse(json) as RawPluginJson;
  } catch (e) {
    throw new Error(`invalid plugin.json: ${(e as Error).message}`);
  }

  if (!parsed.name || !parsed.version) {
    throw new Error('invalid plugin.json: missing name or version');
  }

  const hooks: PluginHook[] = [];
  if (parsed.hooks) {
    for (const [event, entries] of Object.entries(parsed.hooks)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        hooks.push({ event, command: entry.command, matcher: entry.matcher });
      }
    }
  }

  const mcpServers: PluginMcp[] = [];
  if (parsed.mcpServers) {
    for (const [name, cfg] of Object.entries(parsed.mcpServers)) {
      mcpServers.push({ name, command: cfg.command, args: cfg.args, env: cfg.env });
    }
  }

  return { name: parsed.name, version: parsed.version, hooks, mcpServers };
}

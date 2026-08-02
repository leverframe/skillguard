import TOML from '@iarna/toml';
import type { SkillguardManifest, PluginSection, AuthorSection, CompatSection } from './types.js';

const REQUIRED_PLUGIN_FIELDS: (keyof PluginSection)[] = ['name', 'version', 'description', 'license', 'homepage'];
const REQUIRED_AUTHOR_FIELDS: (keyof AuthorSection)[] = ['handle', 'github', 'signing_key_url'];
const REQUIRED_COMPAT_FIELDS: (keyof CompatSection)[] = ['harnesses'];

function validate<T extends object>(section: unknown, fields: (keyof T)[], sectionName: string): T {
  if (!section || typeof section !== 'object') {
    throw new Error(`manifest: missing required [${sectionName}] section`);
  }
  for (const f of fields) {
    if (!(f in (section as object))) {
      throw new Error(`manifest: missing required field [${sectionName}].${String(f)}`);
    }
  }
  return section as T;
}

export function parseManifest(toml: string): SkillguardManifest {
  let parsed: unknown;
  try {
    parsed = TOML.parse(toml);
  } catch (e) {
    throw new Error(`manifest: invalid TOML — ${(e as Error).message}`);
  }

  const obj = parsed as Partial<SkillguardManifest>;
  const plugin = validate<PluginSection>(obj.plugin, REQUIRED_PLUGIN_FIELDS, 'plugin');
  const author = validate<AuthorSection>(obj.author, REQUIRED_AUTHOR_FIELDS, 'author');
  const compat = validate<CompatSection>(obj.compat, REQUIRED_COMPAT_FIELDS, 'compat');

  if (!Array.isArray(compat.harnesses) || compat.harnesses.length === 0) {
    throw new Error('manifest: [compat].harnesses must be a non-empty array');
  }

  return { plugin, author, compat, trust: obj.trust };
}

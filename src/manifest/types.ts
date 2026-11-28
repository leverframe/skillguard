export interface SkillguardManifest {
  plugin: PluginSection;
  author: AuthorSection;
  compat: CompatSection;
  trust?: TrustSection;
}

export interface PluginSection {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
}

export interface AuthorSection {
  handle: string;
  github: string;
  signing_key_url: string;
}

export interface CompatSection {
  harnesses: string[];
  min_cc_version?: string;
}

export interface TrustSection {
  seeking_review?: boolean;
}

export type TrustLevel =
  | "signed"
  | "verified-author"
  | "reviewed"
  | "org-published";

import { crawlRepos } from "./crawl.js";
import { fetchReleaseArtifacts } from "./fetch-release.js";
import { extractFile, listDir } from "./extract-tar-file.js";
import { parseRepoContents } from "./parse.js";
import { computeTrustBadges } from "./trust-badges.js";
import { emitIndex } from "./emit.js";
import type { IndexEntry, FailedRepoEntry } from "./types.js";

export interface PipelineOptions {
  outputPath?: string;
  crawlLimit?: number;
}

export interface PipelineResult {
  entries: IndexEntry[];
  failed: FailedRepoEntry[];
  emittedPath?: string;
}

export async function runPipeline(
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const repos = await crawlRepos();
  const limited = opts.crawlLimit ? repos.slice(0, opts.crawlLimit) : repos;

  const entries: IndexEntry[] = [];
  const failed: FailedRepoEntry[] = [];
  const now = new Date().toISOString();

  for (const coords of limited) {
    const url = `https://github.com/${coords.owner}/${coords.repo}`;
    try {
      const release = await fetchReleaseArtifacts(coords);

      const manifestToml = await extractFile(
        release.tarballPath,
        "skillguard.toml",
      );
      let pluginJson: string | null = null;
      try {
        pluginJson = await extractFile(
          release.tarballPath,
          ".claude-plugin/plugin.json",
        );
      } catch {
        // plugin.json optional
      }

      const { manifest, inventory } = parseRepoContents(
        manifestToml,
        pluginJson,
      );
      const skills = await listDir(release.tarballPath, "skills/").catch(
        () => [] as string[],
      );

      const trustBadges = await computeTrustBadges(coords);

      const entry: IndexEntry = {
        name: manifest.plugin.name,
        version: manifest.plugin.version,
        description: manifest.plugin.description,
        license: manifest.plugin.license,
        homepage: manifest.plugin.homepage,
        repo: { owner: coords.owner, repo: coords.repo, url },
        author: {
          handle: manifest.author.handle,
          github: manifest.author.github,
        },
        signingKeyUrl: manifest.author.signing_key_url,
        releaseTag: release.tagName,
        tarballUrl: release.tarballUrl,
        sigAssetUrl: release.sigAssetUrl,
        trustBadges,
        harnesses: manifest.compat.harnesses,
        inventory: {
          skills,
          hooks: inventory.hooks.map((h) => ({
            event: h.event,
            command: h.command,
          })),
          mcpServers: inventory.mcpServers.map((m) => ({
            name: m.name,
            command: m.command,
          })),
        },
        lastIndexed: now,
      };

      entries.push(entry);
    } catch (e) {
      const reason = (e as Error).message ?? String(e);
      failed.push({
        repo: { owner: coords.owner, repo: coords.repo, url },
        reason,
        at: now,
      });
    }
  }

  const emitOpts = opts.outputPath ? { outputPath: opts.outputPath } : {};
  const emitted = await emitIndex(entries, failed, emitOpts);

  return { entries, failed, emittedPath: emitted.path };
}

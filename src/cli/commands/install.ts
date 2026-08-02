import { readFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { extract } from 'tar';
import { parseRepoUrl, fetchLatestRelease, downloadToTemp } from '../../fetch/github.js';
import { verifySignature } from '../../verify/minisign.js';
import { parseManifest } from '../../manifest/parse.js';
import { parsePluginJson } from '../../preview/plugin-json.js';
import { renderPreview } from '../../preview/render.js';
import { confirmInstall } from '../../prompt/confirm.js';
import { atomicInstall } from '../../install/atomic.js';
import { linkActive } from '../../install/symlink.js';

export interface InstallOptions {
  dryRun: boolean;
  yes: boolean;
}

const PLUGINS_ROOT = process.env.SKILLGUARD_PLUGINS_ROOT ?? join(homedir(), '.claude', 'plugins');
const ACTIVE_DIR = process.env.SKILLGUARD_ACTIVE_DIR ?? join(homedir(), '.claude', 'plugins', 'active');

export async function installCommand(repoUrl: string, opts: InstallOptions): Promise<void> {
  const coords = parseRepoUrl(repoUrl);
  if (!coords) {
    console.error(`Error: not a valid GitHub URL: ${repoUrl}`);
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  console.log(`Fetching latest release for ${coords.owner}/${coords.repo}...`);
  const release = await fetchLatestRelease(coords, token);

  if (!release.sigAsset) {
    console.error('Error: release has no .minisig asset. skillguard refuses unsigned plugins.');
    process.exit(1);
  }
  if (!release.keysAsset) {
    console.error('Error: release has no KEYS.txt asset. Cannot verify signature.');
    process.exit(1);
  }

  console.log(`Downloading tarball + signature for ${release.tagName}...`);
  const tarballPath = await downloadToTemp(release.tarballUrl, token);
  const sigPath = await downloadToTemp(release.sigAsset.url, token);
  const keysPath = await downloadToTemp(release.keysAsset.url, token);

  console.log('Verifying minisign signature...');
  const verified = await verifySignature({
    tarballPath,
    sigPath,
    publicKeyPath: keysPath,
  });
  if (!verified) {
    console.error('Error: signature verification failed. Refusing to install.');
    process.exit(1);
  }
  console.log('Signature verified.');

  const staging = `${tarballPath}.extracted`;
  await mkdir(staging, { recursive: true });
  await extract({ file: tarballPath, cwd: staging, strip: 1 });

  let manifestText: string;
  let pluginJsonText: string | null = null;
  try {
    manifestText = await readFile(join(staging, 'skillguard.toml'), 'utf-8');
  } catch {
    console.error('Error: tarball missing skillguard.toml');
    process.exit(1);
  }
  try {
    pluginJsonText = await readFile(join(staging, '.claude-plugin', 'plugin.json'), 'utf-8');
  } catch {
    // plugin.json optional for skills-only plugins
  }

  const manifest = parseManifest(manifestText);
  const inventory = pluginJsonText
    ? parsePluginJson(pluginJsonText)
    : { name: manifest.plugin.name, version: manifest.plugin.version, hooks: [], mcpServers: [] };

  let skills: string[] = [];
  try {
    skills = await readdir(join(staging, 'skills'));
  } catch {
    skills = [];
  }

  console.log();
  console.log(renderPreview(manifest, inventory, skills));
  console.log();

  if (opts.dryRun) {
    console.log('--dry-run: not installing.');
    return;
  }

  if (!opts.yes) {
    const ok = await confirmInstall('Install this plugin?');
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  const destDir = join(PLUGINS_ROOT, manifest.plugin.name, manifest.plugin.version);
  console.log(`Installing to ${destDir}...`);
  await atomicInstall(tarballPath, destDir, { overwrite: true });

  await linkActive({
    pluginsRoot: PLUGINS_ROOT,
    activeDir: ACTIVE_DIR,
    name: manifest.plugin.name,
    version: manifest.plugin.version,
  });

  console.log(`Installed ${manifest.plugin.name}@${manifest.plugin.version}.`);
}

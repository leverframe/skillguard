import type { RepoCoords } from '../fetch/github.js';
import { getAccountAgeDays } from './account-age.js';
import { countSignedCommitsForUser } from './signed-commits.js';
import { getKeyAgeDays } from './key-age.js';

const MIN_ACCOUNT_AGE_DAYS = 365;
const MIN_SIGNED_COMMITS = 10;
const MIN_KEY_AGE_DAYS = 30;

export interface BadgeThresholds {
  minAccountAgeDays?: number;
  minSignedCommits?: number;
  minKeyAgeDays?: number;
}

export async function computeTrustBadges(
  coords: RepoCoords,
  thresholds: BadgeThresholds = {},
): Promise<string[]> {
  const badges: string[] = ['signed'];

  const minAge = thresholds.minAccountAgeDays ?? MIN_ACCOUNT_AGE_DAYS;
  const minCommits = thresholds.minSignedCommits ?? MIN_SIGNED_COMMITS;
  const minKeyAge = thresholds.minKeyAgeDays ?? MIN_KEY_AGE_DAYS;

  try {
    const [age, signedCount, keyAge] = await Promise.all([
      getAccountAgeDays(coords.owner),
      countSignedCommitsForUser(coords.owner),
      getKeyAgeDays(coords),
    ]);

    if (age >= minAge && signedCount >= minCommits && keyAge >= minKeyAge) {
      badges.push('verified-author');
    }
  } catch {
    // Defensive: any API hiccup → badge degrades to ['signed'] only.
  }

  return badges;
}

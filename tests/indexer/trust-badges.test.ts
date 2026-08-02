import { describe, it, expect, vi } from 'vitest';
import { computeTrustBadges } from '../../src/indexer/trust-badges.js';

vi.mock('../../src/indexer/account-age.js', () => ({
  getAccountAgeDays: vi.fn(),
}));

vi.mock('../../src/indexer/signed-commits.js', () => ({
  countSignedCommitsForUser: vi.fn(),
}));

vi.mock('../../src/indexer/key-age.js', () => ({
  getKeyAgeDays: vi.fn(),
}));

import { getAccountAgeDays } from '../../src/indexer/account-age.js';
import { countSignedCommitsForUser } from '../../src/indexer/signed-commits.js';
import { getKeyAgeDays } from '../../src/indexer/key-age.js';

describe('computeTrustBadges', () => {
  const coords = { owner: 'jane-dev', repo: 'supercoder' };

  it('returns [signed, verified-author] when all criteria met', async () => {
    vi.mocked(getAccountAgeDays).mockResolvedValue(500);
    vi.mocked(countSignedCommitsForUser).mockResolvedValue(15);
    vi.mocked(getKeyAgeDays).mockResolvedValue(60);
    const badges = await computeTrustBadges(coords);
    expect(badges).toContain('signed');
    expect(badges).toContain('verified-author');
    expect(badges).not.toContain('reviewed');
    expect(badges).not.toContain('org-published');
  });

  it('returns [signed] only when account is too new', async () => {
    vi.mocked(getAccountAgeDays).mockResolvedValue(100);
    vi.mocked(countSignedCommitsForUser).mockResolvedValue(50);
    vi.mocked(getKeyAgeDays).mockResolvedValue(100);
    const badges = await computeTrustBadges(coords);
    expect(badges).toEqual(['signed']);
  });

  it('returns [signed] only when too few signed commits', async () => {
    vi.mocked(getAccountAgeDays).mockResolvedValue(800);
    vi.mocked(countSignedCommitsForUser).mockResolvedValue(5);
    vi.mocked(getKeyAgeDays).mockResolvedValue(100);
    const badges = await computeTrustBadges(coords);
    expect(badges).toEqual(['signed']);
  });

  it('returns [signed] only when key is too recent', async () => {
    vi.mocked(getAccountAgeDays).mockResolvedValue(800);
    vi.mocked(countSignedCommitsForUser).mockResolvedValue(50);
    vi.mocked(getKeyAgeDays).mockResolvedValue(10);
    const badges = await computeTrustBadges(coords);
    expect(badges).toEqual(['signed']);
  });

  it('returns [signed] when an API error is swallowed (defensive)', async () => {
    vi.mocked(getAccountAgeDays).mockRejectedValue(new Error('API down'));
    vi.mocked(countSignedCommitsForUser).mockResolvedValue(50);
    vi.mocked(getKeyAgeDays).mockResolvedValue(100);
    const badges = await computeTrustBadges(coords);
    expect(badges).toEqual(['signed']);
  });

  it('uses exact threshold boundaries (365 days, 10 commits, 30 days)', async () => {
    vi.mocked(getAccountAgeDays).mockResolvedValue(365);
    vi.mocked(countSignedCommitsForUser).mockResolvedValue(10);
    vi.mocked(getKeyAgeDays).mockResolvedValue(30);
    const badges = await computeTrustBadges(coords);
    expect(badges).toContain('verified-author');
  });
});

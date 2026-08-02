import { describe, it, expect, vi } from 'vitest';
import { confirmInstall } from './confirm.js';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

import { confirm } from '@inquirer/prompts';

describe('confirmInstall', () => {
  it('returns true when user confirms', async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    const result = await confirmInstall('Install this plugin?');
    expect(result).toBe(true);
  });

  it('returns false when user declines', async () => {
    vi.mocked(confirm).mockResolvedValue(false);
    const result = await confirmInstall('Install this plugin?');
    expect(result).toBe(false);
  });

  it('defaults to false', async () => {
    vi.mocked(confirm).mockImplementation(async (opts) => {
      return opts?.default === true;
    });
    const result = await confirmInstall('Install?');
    expect(result).toBe(false);
  });
});

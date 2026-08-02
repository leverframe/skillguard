import { githubGet } from './github-client.js';

const GITHUB_API = 'https://api.github.com';

interface UserResponse {
  login: string;
  created_at: string;
}

export async function getAccountCreatedAt(handle: string): Promise<Date> {
  const { body } = await githubGet<UserResponse>(`${GITHUB_API}/users/${handle}`);
  return new Date(body.created_at);
}

export async function getAccountAgeDays(handle: string, now: Date = new Date()): Promise<number> {
  const createdAt = await getAccountCreatedAt(handle);
  const ms = now.getTime() - createdAt.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface GithubClient {
  getUser(accessToken: string): Promise<GithubUser>;
}

export class GithubApiError extends Error {
  constructor(readonly status: number) {
    super(`GitHub a répondu ${status}`);
  }
}

export const fetchGithubClient: GithubClient = {
  async getUser(accessToken) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sos-dev',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new GithubApiError(response.status);
    return (await response.json()) as GithubUser;
  },
};

import { describe, expect, it } from 'vitest';
import { CliError } from '../src/args.js';
import { githubDeviceFlow } from '../src/device-flow.js';

function fakeGithub(tokenReplies: object[]) {
  const calls: { url: string; body: Record<string, string> }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    const reply = url.endsWith('/device/code')
      ? { device_code: 'dev-123', user_code: 'ABCD-1234', verification_uri: 'https://github.com/login/device', expires_in: 900, interval: 5 }
      : tokenReplies.shift();
    return new Response(JSON.stringify(reply), { status: 200 });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

describe('githubDeviceFlow', () => {
  it('shows the code, waits, honours slow_down and returns the token', async () => {
    const github = fakeGithub([{ error: 'authorization_pending' }, { error: 'slow_down', interval: 10 }, { access_token: 'gho_ok' }]);
    const waits: number[] = [];
    const shown: string[] = [];
    const token = await githubDeviceFlow('client-1', {
      fetch: github.fetch,
      sleep: async (ms) => void waits.push(ms),
      onCode: (code) => shown.push(code.userCode),
    });
    expect(token).toBe('gho_ok');
    expect(shown).toEqual(['ABCD-1234']);
    expect(waits).toEqual([5000, 5000, 10000]);
    expect(github.calls[0]!.body).toEqual({ client_id: 'client-1', scope: 'read:user' });
    expect(github.calls[1]!.body.device_code).toBe('dev-123');
  });

  it('stops when the user refuses', async () => {
    const github = fakeGithub([{ error: 'access_denied' }]);
    await expect(githubDeviceFlow('client-1', { fetch: github.fetch, sleep: async () => {}, onCode: () => {} })).rejects.toThrow(CliError);
  });
});

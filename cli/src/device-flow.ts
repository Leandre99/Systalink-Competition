import { CliError } from './args.js';

export interface DeviceCode {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
}

export interface DeviceFlowOptions {
  onCode: (code: DeviceCode) => void;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

/**
 * GitHub OAuth device flow: the user types a short code on github.com,
 * the terminal never sees a password. Returns a GitHub access token.
 */
export async function githubDeviceFlow(clientId: string, options: DeviceFlowOptions): Promise<string> {
  const http = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const codeResponse = await http('https://github.com/login/device/code', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ client_id: clientId, scope: 'read:user' }),
  });
  const code = (await codeResponse.json().catch(() => ({}))) as {
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
    error?: string;
    error_description?: string;
  };
  if (!codeResponse.ok || !code.device_code || !code.user_code || !code.verification_uri) {
    throw new CliError(`GitHub refuse la connexion : ${code.error_description ?? code.error ?? codeResponse.status}`);
  }
  const expiresIn = code.expires_in ?? 900;
  options.onCode({ userCode: code.user_code, verificationUri: code.verification_uri, expiresIn });

  let interval = (code.interval ?? 5) * 1000;
  const attempts = Math.ceil((expiresIn * 1000) / interval);
  for (let i = 0; i < attempts; i++) {
    await sleep(interval);
    const response = await http('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ client_id: clientId, device_code: code.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
    });
    const data = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string; interval?: number };
    if (data.access_token) return data.access_token;
    switch (data.error) {
      case 'authorization_pending':
        continue;
      case 'slow_down':
        interval = (data.interval ?? interval / 1000 + 5) * 1000;
        continue;
      case 'access_denied':
        throw new CliError('connexion refusée sur GitHub.');
      case 'expired_token':
        throw new CliError('le code a expiré, relance « sos login ».');
      default:
        throw new CliError(`GitHub : ${data.error_description ?? data.error ?? response.status}`);
    }
  }
  throw new CliError('le code a expiré, relance « sos login ».');
}

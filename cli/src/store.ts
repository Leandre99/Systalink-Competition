import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SosRequest } from '@sos/shared';

export function sosHome(): string {
  return process.env.SOS_HOME ?? path.join(os.homedir(), '.sos');
}

/** Until the server exists (step 2), validated requests are kept locally. */
export function saveRequest(request: SosRequest): string {
  const dir = path.join(sosHome(), 'demandes');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `demande-${request.createdAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(request, null, 2) + '\n', { mode: 0o600 });
  return file;
}

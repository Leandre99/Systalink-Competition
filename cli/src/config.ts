import fs from 'node:fs';
import path from 'node:path';
import { sosHome } from './store.js';

export interface SosConfig {
  server?: string;
  token?: string;
  login?: string;
}

export const DEFAULT_SERVER = 'http://localhost:4000';

export const configPath = (): string => path.join(sosHome(), 'config.json');

export function readConfig(): SosConfig {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8')) as SosConfig;
  } catch {
    return {};
  }
}

/** The file holds the session token: readable by its owner only. */
export function writeConfig(config: SosConfig): void {
  fs.mkdirSync(sosHome(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(configPath(), 0o600);
}

export function serverUrl(config: SosConfig = readConfig()): string {
  return (process.env.SOS_SERVER || config.server || DEFAULT_SERVER).replace(/\/+$/, '');
}

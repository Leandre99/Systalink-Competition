import type { SosRequest } from './request.js';

export interface PublicUser {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  provider: 'github' | 'dev';
}

export interface SessionResponse {
  token: string;
  expiresAt: string;
  user: PublicUser;
}

export interface AuthConfigResponse {
  /** OAuth App client id used by `sos login` (GitHub device flow). */
  githubClientId: string | null;
  devAuth: boolean;
}

export interface RequestSummary {
  id: string;
  status: 'ouverte' | 'fermee';
  tech: string[];
  command: string;
  exitCode: number;
  files: number;
  createdAt: string;
  /** The code is erased from the server at this date. */
  expiresAt: string;
}

export interface CreatedRequest extends RequestSummary {
  secretsMasked: number;
  /** Secrets the server caught that the CLI had missed. */
  secondPassMasked: number;
}

export interface RequestDetail extends RequestSummary {
  request: SosRequest;
}

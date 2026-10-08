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

export type RequestStatus = 'ouverte' | 'acceptee' | 'fermee';

export interface RequestSummary {
  id: string;
  status: RequestStatus;
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

/** A published solution sheet matching an error. */
export interface SolutionHit {
  id: string;
  title: string;
  error: string;
  cause: string;
  fix: string;
  tech: string[];
  /** 0..1 : share of the error's words found in the sheet. */
  score: number;
}

/** ciblee : helpers of the same tech · elargie : close techs (after 2 min) · publique : everyone (after 5 min). */
export type RadarStage = 'ciblee' | 'elargie' | 'publique';

export interface RadarAlert {
  requestId: string;
  tech: string[];
  command: string;
  errorSummary: string;
  files: number;
  stage: RadarStage;
  requester: string;
  createdAt: string;
}

/** WebSocket `/ws`, browser → server. The first message must be `auth`. */
export type ClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'disponible'; tech: string[] }
  | { type: 'pause' }
  | { type: 'suivre'; requestId: string }
  | { type: 'accepter'; requestId: string };

export type ServerMessage =
  | { type: 'bienvenue'; user: PublicUser }
  | { type: 'alerte'; alert: RadarAlert }
  | { type: 'retirer'; requestId: string; raison: 'prise' | 'fermee' | 'expiree' }
  | { type: 'statut'; requestId: string; stage: RadarStage; alerted: number; online: number }
  | { type: 'acceptee'; requestId: string; helper: PublicUser }
  | { type: 'prise'; requestId: string; requester: PublicUser }
  | { type: 'fermee'; requestId: string }
  | { type: 'erreur'; message: string };

import type { SosRequest } from '@sos/shared';

export type Provider = 'github' | 'dev';

export interface User {
  id: string;
  provider: Provider;
  providerId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export type UserInput = Omit<User, 'id' | 'createdAt'>;

export type RequestStatus = 'ouverte' | 'fermee';

export interface StoredRequest {
  id: string;
  userId: string;
  status: RequestStatus;
  tech: string[];
  command: string;
  exitCode: number;
  payload: SosRequest;
  createdAt: Date;
  expiresAt: Date;
}

export interface NewRequest {
  userId: string;
  payload: SosRequest;
  createdAt: Date;
  expiresAt: Date;
}

export interface PurgeResult {
  requests: number;
  sessions: number;
}

export interface Store {
  readonly kind: 'postgres' | 'memoire';
  upsertUser(input: UserInput): Promise<User>;
  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  findUserBySession(tokenHash: string, now: Date): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  createRequest(input: NewRequest): Promise<StoredRequest>;
  countRequestsSince(userId: string, since: Date): Promise<number>;
  /** Expired requests are invisible even before the purge runs. */
  getRequest(id: string, now: Date): Promise<StoredRequest | null>;
  listRequests(userId: string, now: Date): Promise<StoredRequest[]>;
  purgeExpired(now: Date): Promise<PurgeResult>;
  close(): Promise<void>;
}

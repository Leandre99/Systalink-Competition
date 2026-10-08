import { randomUUID } from 'node:crypto';
import type { NewRequest, PurgeResult, Store, StoredRequest, User, UserInput } from './types.js';

/** In-memory store for tests and quick local runs without PostgreSQL. */
export class MemoryStore implements Store {
  readonly kind = 'memoire' as const;
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly requests = new Map<string, StoredRequest>();

  async upsertUser(input: UserInput): Promise<User> {
    const existing = [...this.users.values()].find((u) => u.provider === input.provider && u.providerId === input.providerId);
    if (existing) {
      Object.assign(existing, { login: input.login, name: input.name, avatarUrl: input.avatarUrl });
      return structuredClone(existing);
    }
    const user: User = { id: randomUUID(), ...input, createdAt: new Date() };
    this.users.set(user.id, user);
    return structuredClone(user);
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async findUserBySession(tokenHash: string, now: Date): Promise<User | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    const user = this.users.get(session.userId);
    return user ? structuredClone(user) : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async createRequest(input: NewRequest): Promise<StoredRequest> {
    const request: StoredRequest = {
      id: randomUUID(),
      userId: input.userId,
      status: 'ouverte',
      tech: [...input.payload.tech],
      command: input.payload.command,
      exitCode: input.payload.exitCode,
      payload: structuredClone(input.payload),
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    };
    this.requests.set(request.id, request);
    return structuredClone(request);
  }

  async countRequestsSince(userId: string, since: Date): Promise<number> {
    return [...this.requests.values()].filter((r) => r.userId === userId && r.createdAt >= since).length;
  }

  async getRequest(id: string, now: Date): Promise<StoredRequest | null> {
    const request = this.requests.get(id);
    return request && request.expiresAt > now ? structuredClone(request) : null;
  }

  async listRequests(userId: string, now: Date): Promise<StoredRequest[]> {
    return [...this.requests.values()]
      .filter((r) => r.userId === userId && r.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async purgeExpired(now: Date): Promise<PurgeResult> {
    const result = { requests: 0, sessions: 0 };
    for (const [id, r] of this.requests) if (r.expiresAt <= now && this.requests.delete(id)) result.requests++;
    for (const [hash, s] of this.sessions) if (s.expiresAt <= now && this.sessions.delete(hash)) result.sessions++;
    return result;
  }

  async close(): Promise<void> {}
}

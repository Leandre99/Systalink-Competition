import { randomUUID } from 'node:crypto';
import { solutionWords } from '../solutions/words.js';
import type { NewRequest, NewSolution, PurgeResult, Solution, SolutionDraft, Store, StoredRequest, User, UserInput } from './types.js';

/** In-memory store for tests and quick local runs without PostgreSQL. */
export class MemoryStore implements Store {
  readonly kind = 'memoire' as const;
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly requests = new Map<string, StoredRequest>();
  private readonly helperTech = new Map<string, string[]>();
  private readonly solutions = new Map<string, Solution>();
  private readonly drafts = new Map<string, SolutionDraft>();

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
      helperId: null,
      acceptedAt: null,
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

  async listOpenRequests(now: Date): Promise<StoredRequest[]> {
    return [...this.requests.values()]
      .filter((r) => r.status === 'ouverte' && r.expiresAt > now)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async acceptRequest(id: string, helperId: string, now: Date): Promise<StoredRequest | null> {
    const r = this.requests.get(id);
    if (!r || r.status !== 'ouverte' || r.expiresAt <= now || r.userId === helperId) return null;
    Object.assign(r, { status: 'acceptee', helperId, acceptedAt: now });
    return structuredClone(r);
  }

  async closeRequest(id: string, userId: string): Promise<boolean> {
    const r = this.requests.get(id);
    if (!r || r.userId !== userId || r.status === 'fermee') return false;
    r.status = 'fermee';
    return true;
  }

  async resolveRequest(id: string, userId: string, now: Date): Promise<boolean> {
    const r = this.requests.get(id);
    if (!r || r.status !== 'acceptee' || r.expiresAt <= now || (r.userId !== userId && r.helperId !== userId)) return false;
    Object.assign(r, { status: 'resolue', expiresAt: now });
    return true;
  }

  async getUser(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? structuredClone(user) : null;
  }

  async setHelperTech(userId: string, tech: string[]): Promise<void> {
    this.helperTech.set(userId, [...tech]);
  }

  async getHelperTech(userId: string): Promise<string[]> {
    return [...(this.helperTech.get(userId) ?? [])];
  }

  async createSolutionDraft(input: Omit<SolutionDraft, 'requesterApproved' | 'helperApproved' | 'published'>): Promise<SolutionDraft> {
    const draft = { ...structuredClone(input), requesterApproved: false, helperApproved: false, published: false };
    this.drafts.set(input.requestId, draft);
    return structuredClone(draft);
  }

  async getSolutionDraft(requestId: string): Promise<SolutionDraft | null> {
    const draft = this.drafts.get(requestId);
    return draft ? structuredClone(draft) : null;
  }

  async approveSolutionDraft(requestId: string, userId: string): Promise<SolutionDraft | null> {
    const draft = this.drafts.get(requestId);
    const request = this.requests.get(requestId);
    if (!draft || !request || (userId !== request.userId && userId !== request.helperId)) return null;
    if (userId === request.userId) draft.requesterApproved = true;
    if (userId === request.helperId) draft.helperApproved = true;
    if (draft.requesterApproved && draft.helperApproved && !draft.published) {
      draft.published = true;
      this.solutions.set(draft.id, { id: draft.id, title: draft.title, error: draft.error, cause: draft.cause, fix: draft.fix, tech: draft.tech, createdAt: new Date() });
    }
    return structuredClone(draft);
  }

  async getPassportStats(userId: string) {
    const resolved = [...this.requests.values()].filter((r) => r.status === 'resolue' && r.helperId === userId);
    const minutes = resolved
      .filter((r) => r.acceptedAt)
      .map((r) => Math.max(0, (r.expiresAt.getTime() - r.acceptedAt!.getTime()) / 60000));
    return {
      helpsConfirmed: resolved.length,
      averageResolutionMinutes: minutes.length ? Math.round((minutes.reduce((a, b) => a + b, 0) / minutes.length) * 10) / 10 : null,
      technologies: [...new Set(resolved.flatMap((r) => r.tech))].sort(),
      proofIds: resolved.map((r) => r.id),
    };
  }

  async seedSolutions(solutions: NewSolution[]): Promise<void> {
    for (const s of solutions) if (!this.solutions.has(s.id)) this.solutions.set(s.id, { ...structuredClone(s), createdAt: new Date() });
  }

  async findSolutionCandidates(words: string[], limit: number): Promise<Solution[]> {
    const wanted = new Set(words);
    return [...this.solutions.values()]
      .filter((s) => solutionWords(`${s.title} ${s.error} ${s.cause} ${s.fix}`, 1000).some((w) => wanted.has(w)))
      .slice(0, limit)
      .map((s) => structuredClone(s));
  }

  async purgeExpired(now: Date): Promise<PurgeResult> {
    const result = { requests: 0, sessions: 0 };
    for (const [id, r] of this.requests) if (r.expiresAt <= now && this.requests.delete(id)) result.requests++;
    for (const [hash, s] of this.sessions) if (s.expiresAt <= now && this.sessions.delete(hash)) result.sessions++;
    return result;
  }

  async close(): Promise<void> {}
}

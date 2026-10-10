import { createHash, randomUUID } from 'node:crypto';
import { maskSecrets, type SosRequest } from '@sos/shared';
import type pg from 'pg';
import type { CafChallengeItem, CafEvalCriterion, CafEvaluationItem, CafEventItem, CafEventStatus, CafSubmissionItem, CafTeamItem, CafTeamJoinItem, CafTeamMemberItem, JoinRequestStatus, NewProjectInput, NewReportInput, NewRequest, NewSolution, PassportProofItem, PassportStatsResult, ProjectJoinItem, ProjectShowcaseItem, ProjectStatus, ProjectTaskItem, Provider, PurgeResult, ReportItem, ReportReason, ReportStatus, ReportTargetType, RequestStatus, Solution, SolutionDraft, Store, StoredRequest, TaskStatus, User, UserInput } from './types.js';


interface UserRow {
  id: string;
  provider: Provider;
  provider_id: string;
  login: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
}

interface RequestRow {
  id: string;
  user_id: string;
  status: RequestStatus;
  tech: string[];
  command: string;
  exit_code: number;
  payload: SosRequest;
  helper_id: string | null;
  accepted_at: Date | null;
  created_at: Date;
  expires_at: Date;
}

interface SolutionRow {
  id: string;
  title: string;
  error: string;
  cause: string;
  fix: string;
  tech: string[];
  created_at: Date;
}

const toSolution = (row: SolutionRow): Solution => ({
  id: row.id,
  title: row.title,
  error: row.error,
  cause: row.cause,
  fix: row.fix,
  tech: row.tech,
  createdAt: row.created_at,
});

const toUser = (row: UserRow): User => ({
  id: row.id,
  provider: row.provider,
  providerId: row.provider_id,
  login: row.login,
  name: row.name,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
});

const toRequest = (row: RequestRow): StoredRequest => ({
  id: row.id,
  userId: row.user_id,
  status: row.status,
  tech: row.tech,
  command: row.command,
  exitCode: row.exit_code,
  payload: row.payload,
  helperId: row.helper_id,
  acceptedAt: row.accepted_at,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

export class PgStore implements Store {
  readonly kind = 'postgres' as const;

  constructor(private readonly pool: pg.Pool) {}

  async upsertUser(input: UserInput): Promise<User> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (id, provider, provider_id, login, name, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (provider, provider_id)
       DO UPDATE SET login = EXCLUDED.login, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
       RETURNING *`,
      [randomUUID(), input.provider, input.providerId, input.login, input.name, input.avatarUrl],
    );
    return toUser(rows[0]!);
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [tokenHash, userId, expiresAt]);
  }

  async findUserBySession(tokenHash: string, now: Date): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  async createRequest(input: NewRequest): Promise<StoredRequest> {
    const { payload } = input;
    const { rows } = await this.pool.query<RequestRow>(
      `INSERT INTO requests (id, user_id, tech, command, exit_code, payload, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [randomUUID(), input.userId, payload.tech, payload.command, payload.exitCode, JSON.stringify(payload), input.createdAt, input.expiresAt],
    );
    return toRequest(rows[0]!);
  }

  async countRequestsSince(userId: string, since: Date): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      'SELECT count(*) FROM requests WHERE user_id = $1 AND created_at >= $2',
      [userId, since],
    );
    return Number(rows[0]!.count);
  }

  async getRequest(id: string, now: Date): Promise<StoredRequest | null> {
    const { rows } = await this.pool.query<RequestRow>('SELECT * FROM requests WHERE id = $1 AND expires_at > $2', [id, now]);
    return rows[0] ? toRequest(rows[0]) : null;
  }

  async listRequests(userId: string, now: Date): Promise<StoredRequest[]> {
    const { rows } = await this.pool.query<RequestRow>(
      'SELECT * FROM requests WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC',
      [userId, now],
    );
    return rows.map(toRequest);
  }

  async listOpenRequests(now: Date): Promise<StoredRequest[]> {
    const { rows } = await this.pool.query<RequestRow>(
      "SELECT * FROM requests WHERE status = 'ouverte' AND expires_at > $1 ORDER BY created_at",
      [now],
    );
    return rows.map(toRequest);
  }

  async acceptRequest(id: string, helperId: string, now: Date): Promise<StoredRequest | null> {
    const { rows } = await this.pool.query<RequestRow>(
      `UPDATE requests SET status = 'acceptee', helper_id = $2, accepted_at = $3
       WHERE id = $1 AND status = 'ouverte' AND expires_at > $3 AND user_id <> $2
       RETURNING *`,
      [id, helperId, now],
    );
    return rows[0] ? toRequest(rows[0]) : null;
  }

  async closeRequest(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE requests SET status = 'fermee' WHERE id = $1 AND user_id = $2 AND status <> 'fermee'",
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async resolveRequest(id: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE requests SET status = 'resolue', resolved_at = $3, expires_at = $3
       WHERE id = $1 AND status = 'acceptee' AND expires_at > $3 AND (user_id = $2 OR helper_id = $2)`,
      [id, userId, now],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getUser(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async setHelperTech(userId: string, tech: string[]): Promise<void> {
    await this.pool.query(
      `INSERT INTO helper_profiles (user_id, tech) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET tech = EXCLUDED.tech, updated_at = now()`,
      [userId, tech],
    );
  }

  async getHelperTech(userId: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ tech: string[] }>('SELECT tech FROM helper_profiles WHERE user_id = $1', [userId]);
    return rows[0]?.tech ?? [];
  }

  async createSolutionDraft(input: Omit<SolutionDraft, 'requesterApproved' | 'helperApproved' | 'published'>): Promise<SolutionDraft> {
    const { rows } = await this.pool.query(
      `INSERT INTO solution_drafts (id, request_id, title, error, cause, fix, tech)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (request_id) DO UPDATE SET title=EXCLUDED.title,error=EXCLUDED.error,cause=EXCLUDED.cause,fix=EXCLUDED.fix,tech=EXCLUDED.tech RETURNING *`,
      [input.id, input.requestId, input.title, input.error, input.cause, input.fix, input.tech],
    );
    return this.toDraft(rows[0]);
  }

  async getSolutionDraft(requestId: string, userId?: string): Promise<SolutionDraft | null> {
    const request = await this.pool.query<{ user_id: string; helper_id: string | null }>('SELECT user_id, helper_id FROM requests WHERE id = $1', [requestId]);
    const r = request.rows[0];
    if (!r) return null;
    if (userId && userId !== r.user_id && userId !== r.helper_id) return null;
    const { rows } = await this.pool.query('SELECT * FROM solution_drafts WHERE request_id = $1', [requestId]);
    return rows[0] ? this.toDraft(rows[0]) : null;
  }

  async updateSolutionDraft(requestId: string, userId: string, update: { title?: string; cause?: string; fix?: string }): Promise<SolutionDraft | null> {
    const request = await this.pool.query<{ user_id: string; helper_id: string | null }>('SELECT user_id, helper_id FROM requests WHERE id = $1', [requestId]);
    const r = request.rows[0];
    if (!r || (r.user_id !== userId && r.helper_id !== userId)) return null;
    const current = await this.getSolutionDraft(requestId);
    if (!current) return null;
    const title = update.title ? maskSecrets(update.title).text : current.title;
    const cause = update.cause ? maskSecrets(update.cause).text : current.cause;
    const fix = update.fix ? maskSecrets(update.fix).text : current.fix;
    const { rows } = await this.pool.query(
      `UPDATE solution_drafts SET title = $1, cause = $2, fix = $3, requester_approved = false, helper_approved = false, published = false WHERE request_id = $4 RETURNING *`,
      [title, cause, fix, requestId],
    );
    return rows[0] ? this.toDraft(rows[0]) : null;
  }

  async approveSolutionDraft(requestId: string, userId: string): Promise<SolutionDraft | null> {
    const request = await this.pool.query<{ user_id: string; helper_id: string | null }>('SELECT user_id, helper_id FROM requests WHERE id = $1', [requestId]);
    const r = request.rows[0];
    if (!r || (r.user_id !== userId && r.helper_id !== userId)) return null;
    const column = r.user_id === userId ? 'requester_approved' : 'helper_approved';
    const { rows } = await this.pool.query(`UPDATE solution_drafts SET ${column} = true WHERE request_id = $1 RETURNING *`, [requestId]);
    if (!rows[0]) return null;
    if (rows[0].requester_approved && rows[0].helper_approved && !rows[0].published) {
      await this.pool.query(`UPDATE solution_drafts SET published = true WHERE request_id = $1`, [requestId]);
      await this.pool.query(
        `INSERT INTO solutions (id,title,error,cause,fix,tech) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [rows[0].id, rows[0].title, rows[0].error, rows[0].cause, rows[0].fix, rows[0].tech],
      );
    }
    return this.toDraft((await this.pool.query('SELECT * FROM solution_drafts WHERE request_id = $1', [requestId])).rows[0]);
  }

  private toDraft(row: any): SolutionDraft {
    return { id: row.id, requestId: row.request_id, title: row.title, error: row.error, cause: row.cause, fix: row.fix, tech: row.tech, requesterApproved: row.requester_approved, helperApproved: row.helper_approved, published: row.published };
  }

  private readonly revokedProofs = new Set<string>();

  async getPassportStats(userId: string): Promise<PassportStatsResult> {
    const stats = await this.pool.query<{ helps: string; avg_minutes: number | null }>(
      `SELECT count(*) AS helps,
              avg(EXTRACT(EPOCH FROM (resolved_at - accepted_at)) / 60) AS avg_minutes
       FROM requests WHERE helper_id = $1 AND status = 'resolue'`,
      [userId],
    );
    const queryRes = await this.pool.query<{ id: string; tech: string[]; command: string; created_at: Date; payload: any }>(
      `SELECT id, tech, command, created_at, payload FROM requests WHERE helper_id = $1 AND status = 'resolue' ORDER BY resolved_at DESC`,
      [userId],
    );
    const row = stats.rows[0]!;
    const helpsConfirmed = Number(row.helps);

    const proofs: PassportProofItem[] = queryRes.rows.map((r) => {
      const dateIso = r.created_at.toISOString();
      const proofHash = createHash('sha256').update(`${userId}:${r.id}:${dateIso}`).digest('hex');
      const isRevoked = this.revokedProofs.has(`${userId}:${r.id}`);
      return {
        id: `proof-${r.id}`,
        requestId: r.id,
        confirmedAt: r.created_at,
        tech: r.tech,
        proofHash,
        summary: r.payload?.output ? String(r.payload.output).slice(0, 120) : `Aide confirmée sur la commande ${r.command}`,
        revoked: isRevoked,
      };
    });

    return {
      helpsConfirmed,
      points: helpsConfirmed * 10,
      hasConfirmedBadge: helpsConfirmed > 0,
      averageResolutionMinutes: row.avg_minutes == null ? null : Math.round(Number(row.avg_minutes) * 10) / 10,
      technologies: [...new Set(queryRes.rows.flatMap((proof) => proof.tech))].sort(),
      proofs,
    };
  }

  async revokePassportProof(userId: string, proofId: string, revoked: boolean): Promise<boolean> {
    const realId = proofId.startsWith('proof-') ? proofId.slice(6) : proofId;
    const key = `${userId}:${realId}`;
    if (revoked) {
      this.revokedProofs.add(key);
    } else {
      this.revokedProofs.delete(key);
    }
    return true;
  }

  async getPublicPassport(login: string): Promise<{ user: User; stats: PassportStatsResult } | null> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE lower(login) = lower($1)', [login]);
    if (!rows[0]) return null;
    const user = toUser(rows[0]);
    const fullStats = await this.getPassportStats(user.id);
    const activeProofs = fullStats.proofs.filter((p) => !p.revoked);
    return {
      user,
      stats: {
        ...fullStats,
        helpsConfirmed: activeProofs.length,
        points: activeProofs.length * 10,
        hasConfirmedBadge: activeProofs.length > 0,
        proofs: activeProofs,
      },
    };
  }

  async seedSolutions(solutions: NewSolution[]): Promise<void> {
    for (const s of solutions) {
      await this.pool.query(
        `INSERT INTO solutions (id, title, error, cause, fix, tech) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.title, s.error, s.cause, s.fix, s.tech],
      );
    }
  }

  async findSolutionCandidates(words: string[], limit: number): Promise<Solution[]> {
    const terms = words.filter((w) => /^[\p{L}\p{N}_]+$/u.test(w));
    if (!terms.length) {
      const { rows } = await this.pool.query<SolutionRow>(
        `SELECT id, title, error, cause, fix, tech, created_at FROM solutions ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
      return rows.map(toSolution);
    }
    const { rows } = await this.pool.query<SolutionRow>(
      `SELECT id, title, error, cause, fix, tech, created_at FROM solutions
       WHERE search @@ to_tsquery('simple', $1)
       ORDER BY ts_rank(search, to_tsquery('simple', $1)) DESC
       LIMIT $2`,
      [terms.join(' | '), limit],
    );
    return rows.map(toSolution);
  }

  private readonly projects = new Map<string, ProjectShowcaseItem>();
  private readonly joinRequests = new Map<string, ProjectJoinItem>();
  private readonly tasks = new Map<string, ProjectTaskItem>();

  async createProject(input: NewProjectInput): Promise<ProjectShowcaseItem> {
    const id = randomUUID();
    const now = new Date();
    const item: ProjectShowcaseItem = {
      id,
      userId: input.userId,
      name: maskSecrets(input.name).text,
      description: maskSecrets(input.description).text,
      tech: input.tech,
      repositoryUrl: input.repositoryUrl ? maskSecrets(input.repositoryUrl).text : null,
      demoUrl: input.demoUrl ? maskSecrets(input.demoUrl).text : null,
      rolesNeeded: input.rolesNeeded,
      status: input.status,
      published: input.published,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, item);
    return structuredClone(item);
  }

  async updateProject(id: string, userId: string, update: Partial<NewProjectInput>): Promise<ProjectShowcaseItem | null> {
    const item = this.projects.get(id);
    if (!item || item.userId !== userId) return null;
    if (update.name !== undefined) item.name = maskSecrets(update.name).text;
    if (update.description !== undefined) item.description = maskSecrets(update.description).text;
    if (update.tech !== undefined) item.tech = update.tech;
    if (update.repositoryUrl !== undefined) item.repositoryUrl = update.repositoryUrl ? maskSecrets(update.repositoryUrl).text : null;
    if (update.demoUrl !== undefined) item.demoUrl = update.demoUrl ? maskSecrets(update.demoUrl).text : null;
    if (update.rolesNeeded !== undefined) item.rolesNeeded = update.rolesNeeded;
    if (update.status !== undefined) item.status = update.status;
    if (update.published !== undefined) item.published = update.published;
    item.updatedAt = new Date();
    return structuredClone(item);
  }

  async publishProject(id: string, userId: string, published: boolean): Promise<ProjectShowcaseItem | null> {
    return this.updateProject(id, userId, { published });
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const item = this.projects.get(id);
    if (!item || item.userId !== userId) return false;
    return this.projects.delete(id);
  }

  async getProject(id: string, userId?: string): Promise<ProjectShowcaseItem | null> {
    const item = this.projects.get(id);
    if (!item) return null;
    if (!item.published && item.userId !== userId) return null;
    return structuredClone(item);
  }

  async listProjects(filter?: { tech?: string[]; status?: ProjectStatus; search?: string }, userId?: string): Promise<ProjectShowcaseItem[]> {
    return [...this.projects.values()]
      .filter((p) => p.published || p.userId === userId)
      .filter((p) => !filter?.status || p.status === filter.status)
      .filter((p) => !filter?.tech?.length || p.tech.some((t) => filter.tech!.includes(t)))
      .filter((p) => !filter?.search || p.name.toLowerCase().includes(filter.search.toLowerCase()) || p.description.toLowerCase().includes(filter.search.toLowerCase()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((p) => structuredClone(p));
  }

  async createJoinRequest(projectId: string, applicantId: string, message: string): Promise<ProjectJoinItem | null> {
    const project = this.projects.get(projectId);
    if (!project || !project.published || project.status !== 'ouvert') return null;
    const existing = [...this.joinRequests.values()].find((r) => r.projectId === projectId && r.applicantId === applicantId);
    if (existing) return structuredClone(existing);
    const id = randomUUID();
    const item: ProjectJoinItem = {
      id,
      projectId,
      applicantId,
      message: maskSecrets(message).text,
      status: 'en_attente',
      createdAt: new Date(),
    };
    this.joinRequests.set(id, item);
    return structuredClone(item);
  }

  async listJoinRequests(projectId: string, ownerId: string): Promise<ProjectJoinItem[]> {
    const project = this.projects.get(projectId);
    if (!project || project.userId !== ownerId) return [];
    return [...this.joinRequests.values()]
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async getUserJoinRequest(projectId: string, applicantId: string): Promise<ProjectJoinItem | null> {
    const item = [...this.joinRequests.values()].find((r) => r.projectId === projectId && r.applicantId === applicantId);
    return item ? structuredClone(item) : null;
  }

  async respondJoinRequest(requestId: string, ownerId: string, status: 'acceptee' | 'refusee'): Promise<ProjectJoinItem | null> {
    const item = this.joinRequests.get(requestId);
    if (!item) return null;
    const project = this.projects.get(item.projectId);
    if (!project || project.userId !== ownerId) return null;
    item.status = status;
    return structuredClone(item);
  }

  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const project = this.projects.get(projectId);
    if (!project) return false;
    if (project.userId === userId) return true;
    const acceptedReq = [...this.joinRequests.values()].find((r) => r.projectId === projectId && r.applicantId === userId && r.status === 'acceptee');
    return !!acceptedReq;
  }

  async listTasks(projectId: string, userId: string): Promise<ProjectTaskItem[]> {
    if (!(await this.isProjectMember(projectId, userId))) return [];
    return [...this.tasks.values()]
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => structuredClone(t));
  }

  async createTask(projectId: string, userId: string, title: string): Promise<ProjectTaskItem | null> {
    if (!(await this.isProjectMember(projectId, userId))) return null;
    const id = randomUUID();
    const item: ProjectTaskItem = {
      id,
      projectId,
      title: maskSecrets(title).text,
      status: 'a_faire',
      createdById: userId,
      createdAt: new Date(),
    };
    this.tasks.set(id, item);
    return structuredClone(item);
  }

  private readonly reports = new Map<string, ReportItem>();

  async updateTask(projectId: string, taskId: string, userId: string, update: { title?: string; status?: TaskStatus }): Promise<ProjectTaskItem | null> {
    if (!(await this.isProjectMember(projectId, userId))) return null;
    const item = this.tasks.get(taskId);
    if (!item || item.projectId !== projectId) return null;
    if (update.title !== undefined) item.title = maskSecrets(update.title).text;
    if (update.status !== undefined) item.status = update.status;
    return structuredClone(item);
  }

  async createReport(input: NewReportInput): Promise<ReportItem> {
    const id = randomUUID();
    const item: ReportItem = {
      id,
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ? maskSecrets(input.details).text : null,
      status: 'en_attente',
      createdAt: new Date(),
    };
    this.reports.set(id, item);
    return structuredClone(item);
  }

  async hasRecentReport(reporterId: string, targetType: ReportTargetType, targetId: string): Promise<boolean> {
    return [...this.reports.values()].some(
      (r) => r.reporterId === reporterId && r.targetType === targetType && r.targetId === targetId && r.status === 'en_attente',
    );
  }

  async countReportsSince(reporterId: string, since: Date): Promise<number> {
    return [...this.reports.values()].filter((r) => r.reporterId === reporterId && r.createdAt >= since).length;
  }

  async listReports(status?: ReportStatus): Promise<ReportItem[]> {
    return [...this.reports.values()]
      .filter((r) => !status || r.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async resolveReport(reportId: string, status: 'traite' | 'rejete'): Promise<ReportItem | null> {
    const item = this.reports.get(reportId);
    if (!item) return null;
    item.status = status;
    return structuredClone(item);
  }

  // CAF maps in PgStore fallback
  private readonly cafEvents = new Map<string, CafEventItem>();
  private readonly cafTeams = new Map<string, CafTeamItem>();
  private readonly cafTeamJoinRequests = new Map<string, CafTeamJoinItem>();
  private readonly cafChallenges = new Map<string, CafChallengeItem>();
  private readonly cafSubmissions = new Map<string, CafSubmissionItem>();
  private readonly cafEvaluations = new Map<string, CafEvaluationItem>();

  async createCafEvent(input: Omit<CafEventItem, 'id' | 'createdAt'>): Promise<CafEventItem> {
    const id = randomUUID();
    const item: CafEventItem = {
      id,
      ...input,
      title: maskSecrets(input.title).text,
      theme: maskSecrets(input.theme).text,
      rules: maskSecrets(input.rules).text,
      createdAt: new Date(),
    };
    this.cafEvents.set(id, item);
    return structuredClone(item);
  }

  async getCafEvent(id: string): Promise<CafEventItem | null> {
    const item = this.cafEvents.get(id);
    return item ? structuredClone(item) : null;
  }

  async listCafEvents(status?: CafEventStatus): Promise<CafEventItem[]> {
    return [...this.cafEvents.values()]
      .filter((e) => !status || e.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((e) => structuredClone(e));
  }

  async updateCafEventStatus(id: string, status: CafEventStatus): Promise<CafEventItem | null> {
    const item = this.cafEvents.get(id);
    if (!item) return null;
    item.status = status;
    return structuredClone(item);
  }

  async createCafTeam(input: Omit<CafTeamItem, 'id' | 'createdAt'>): Promise<CafTeamItem> {
    const id = randomUUID();
    const item: CafTeamItem = {
      id,
      ...input,
      name: maskSecrets(input.name).text,
      region: maskSecrets(input.region).text,
      createdAt: new Date(),
    };
    this.cafTeams.set(id, item);
    return structuredClone(item);
  }

  async getCafTeam(id: string): Promise<CafTeamItem | null> {
    const item = this.cafTeams.get(id);
    return item ? structuredClone(item) : null;
  }

  async listCafTeams(eventId: string): Promise<CafTeamItem[]> {
    return [...this.cafTeams.values()]
      .filter((t) => t.eventId === eventId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => structuredClone(t));
  }

  async createCafTeamJoinRequest(teamId: string, applicantId: string, country: string, role: string, message: string): Promise<CafTeamJoinItem | null> {
    const team = this.cafTeams.get(teamId);
    if (!team) return null;
    const id = randomUUID();
    const item: CafTeamJoinItem = {
      id,
      teamId,
      applicantId,
      country: maskSecrets(country).text,
      role: maskSecrets(role).text,
      message: maskSecrets(message).text,
      status: 'en_attente',
      createdAt: new Date(),
    };
    this.cafTeamJoinRequests.set(id, item);
    return structuredClone(item);
  }

  async listCafTeamJoinRequests(teamId: string, leaderId: string): Promise<CafTeamJoinItem[]> {
    const team = this.cafTeams.get(teamId);
    if (!team || team.leaderId !== leaderId) return [];
    return [...this.cafTeamJoinRequests.values()]
      .filter((r) => r.teamId === teamId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async respondCafTeamJoinRequest(requestId: string, leaderId: string, status: 'acceptee' | 'refusee'): Promise<CafTeamJoinItem | null> {
    const req = this.cafTeamJoinRequests.get(requestId);
    if (!req) return null;
    const team = this.cafTeams.get(req.teamId);
    if (!team || team.leaderId !== leaderId) return null;
    req.status = status;
    if (status === 'acceptee') {
      if (!team.members.some((m) => m.userId === req.applicantId)) {
        team.members.push({ userId: req.applicantId, country: req.country, role: req.role });
      }
    }
    return structuredClone(req);
  }

  async createCafChallenge(input: Omit<CafChallengeItem, 'id'>): Promise<CafChallengeItem> {
    const id = randomUUID();
    const item: CafChallengeItem = {
      id,
      ...input,
      title: maskSecrets(input.title).text,
      description: maskSecrets(input.description).text,
    };
    this.cafChallenges.set(id, item);
    return structuredClone(item);
  }

  async listCafChallenges(eventId: string): Promise<CafChallengeItem[]> {
    return [...this.cafChallenges.values()]
      .filter((c) => c.eventId === eventId)
      .map((c) => structuredClone(c));
  }

  async createCafSubmission(input: Omit<CafSubmissionItem, 'id' | 'submittedAt'>): Promise<CafSubmissionItem | null> {
    const id = randomUUID();
    const item: CafSubmissionItem = {
      id,
      ...input,
      repositoryUrl: maskSecrets(input.repositoryUrl).text,
      demoUrl: maskSecrets(input.demoUrl).text,
      presentation: maskSecrets(input.presentation).text,
      submittedAt: new Date(),
    };
    this.cafSubmissions.set(id, item);
    return structuredClone(item);
  }

  async listCafSubmissions(eventId: string): Promise<CafSubmissionItem[]> {
    return [...this.cafSubmissions.values()]
      .filter((s) => s.eventId === eventId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .map((s) => structuredClone(s));
  }

  async createCafEvaluation(input: Omit<CafEvaluationItem, 'id' | 'evaluatedAt'>): Promise<CafEvaluationItem> {
    const id = randomUUID();
    const item: CafEvaluationItem = {
      id,
      ...input,
      comments: input.comments ? maskSecrets(input.comments).text : null,
      evaluatedAt: new Date(),
    };
    this.cafEvaluations.set(id, item);
    return structuredClone(item);
  }

  async listCafEvaluations(eventId: string): Promise<CafEvaluationItem[]> {
    return [...this.cafEvaluations.values()]
      .filter((e) => e.eventId === eventId)
      .map((e) => structuredClone(e));
  }

  async purgeExpired(now: Date): Promise<PurgeResult> {
    const requests = await this.pool.query('DELETE FROM requests WHERE expires_at <= $1', [now]);
    const sessions = await this.pool.query('DELETE FROM sessions WHERE expires_at <= $1', [now]);
    return { requests: requests.rowCount ?? 0, sessions: sessions.rowCount ?? 0 };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}


import { createHash, randomUUID } from 'node:crypto';
import { maskSecrets } from '@sos/shared';
import { solutionWords } from '../solutions/words.js';
import type { CafChallengeItem, CafEvalCriterion, CafEvaluationItem, CafEventItem, CafEventStatus, CafSubmissionItem, CafTeamItem, CafTeamJoinItem, CafTeamMemberItem, JoinRequestStatus, NewProjectInput, NewReportInput, NewRequest, NewSolution, PassportProofItem, PassportStatsResult, ProjectJoinItem, ProjectShowcaseItem, ProjectStatus, ProjectTaskItem, PurgeResult, ReportItem, ReportReason, ReportStatus, ReportTargetType, Solution, SolutionDraft, Store, StoredRequest, TaskStatus, User, UserInput } from './types.js';

/** In-memory store for tests and quick local runs without PostgreSQL. */
export class MemoryStore implements Store {
  readonly kind = 'memoire' as const;
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly requests = new Map<string, StoredRequest>();
  private readonly helperTech = new Map<string, string[]>();
  private readonly solutions = new Map<string, Solution>();
  private readonly drafts = new Map<string, SolutionDraft>();
  private readonly projects = new Map<string, ProjectShowcaseItem>();
  private readonly joinRequests = new Map<string, ProjectJoinItem>();
  private readonly tasks = new Map<string, ProjectTaskItem>();
  private readonly reports = new Map<string, ReportItem>();
  private readonly revokedProofs = new Set<string>();
  private readonly cafEvents = new Map<string, CafEventItem>();
  private readonly cafTeams = new Map<string, CafTeamItem>();
  private readonly cafTeamJoinRequests = new Map<string, CafTeamJoinItem>();
  private readonly cafChallenges = new Map<string, CafChallengeItem>();
  private readonly cafSubmissions = new Map<string, CafSubmissionItem>();
  private readonly cafEvaluations = new Map<string, CafEvaluationItem>();

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
    const draft: SolutionDraft = {
      ...structuredClone(input),
      title: maskSecrets(input.title).text,
      error: maskSecrets(input.error).text,
      cause: maskSecrets(input.cause).text,
      fix: maskSecrets(input.fix).text,
      requesterApproved: false,
      helperApproved: false,
      published: false,
    };
    this.drafts.set(input.requestId, draft);
    return structuredClone(draft);
  }

  async getSolutionDraft(requestId: string, userId?: string): Promise<SolutionDraft | null> {
    const draft = this.drafts.get(requestId);
    const request = this.requests.get(requestId);
    if (!draft || !request) return null;
    if (userId && userId !== request.userId && userId !== request.helperId) return null;
    return structuredClone(draft);
  }

  async updateSolutionDraft(requestId: string, userId: string, update: { title?: string; cause?: string; fix?: string }): Promise<SolutionDraft | null> {
    const draft = this.drafts.get(requestId);
    const request = this.requests.get(requestId);
    if (!draft || !request || (userId !== request.userId && userId !== request.helperId)) return null;
    if (update.title) draft.title = maskSecrets(update.title).text;
    if (update.cause) draft.cause = maskSecrets(update.cause).text;
    if (update.fix) draft.fix = maskSecrets(update.fix).text;
    draft.requesterApproved = false;
    draft.helperApproved = false;
    draft.published = false;
    return structuredClone(draft);
  }

  async approveSolutionDraft(requestId: string, userId: string): Promise<SolutionDraft | null> {
    const draft = this.drafts.get(requestId);
    const request = this.requests.get(requestId);
    if (!draft || !request || (userId !== request.userId && userId !== request.helperId)) return null;
    if (userId === request.userId) draft.requesterApproved = true;
    if (userId === request.helperId) draft.helperApproved = true;
    if (draft.requesterApproved && draft.helperApproved && !draft.published) {
      draft.published = true;
      this.solutions.set(draft.id, {
        id: draft.id,
        title: maskSecrets(draft.title).text,
        error: maskSecrets(draft.error).text,
        cause: maskSecrets(draft.cause).text,
        fix: maskSecrets(draft.fix).text,
        tech: draft.tech,
        createdAt: new Date(),
      });
    }
    return structuredClone(draft);
  }

  async getPassportStats(userId: string): Promise<PassportStatsResult> {
    const resolved = [...this.requests.values()].filter((r) => r.status === 'resolue' && r.helperId === userId);
    const minutes = resolved
      .filter((r) => r.acceptedAt)
      .map((r) => Math.max(0, (r.expiresAt.getTime() - r.acceptedAt!.getTime()) / 60000));
    const helpsConfirmed = resolved.length;

    const proofs: PassportProofItem[] = resolved.map((r) => {
      const dateIso = r.createdAt.toISOString();
      const proofHash = createHash('sha256').update(`${userId}:${r.id}:${dateIso}`).digest('hex');
      const isRevoked = this.revokedProofs.has(`${userId}:${r.id}`);
      return {
        id: `proof-${r.id}`,
        requestId: r.id,
        confirmedAt: r.createdAt,
        tech: r.tech,
        proofHash,
        summary: r.payload?.output ? r.payload.output.slice(0, 120) : `Aide confirmée sur la commande ${r.command}`,
        revoked: isRevoked,
      };
    });

    return {
      helpsConfirmed,
      points: helpsConfirmed * 10,
      hasConfirmedBadge: helpsConfirmed > 0,
      averageResolutionMinutes: minutes.length ? Math.round((minutes.reduce((a, b) => a + b, 0) / minutes.length) * 10) / 10 : null,
      technologies: [...new Set(resolved.flatMap((r) => r.tech))].sort(),
      proofs,
    };
  }

  async revokePassportProof(userId: string, proofId: string, revoked: boolean): Promise<boolean> {
    const realId = proofId.startsWith('proof-') ? proofId.slice(6) : proofId;
    const req = this.requests.get(realId);
    if (!req || req.helperId !== userId || req.status !== 'resolue') return false;
    const key = `${userId}:${realId}`;
    if (revoked) {
      this.revokedProofs.add(key);
    } else {
      this.revokedProofs.delete(key);
    }
    return true;
  }

  async getPublicPassport(login: string): Promise<{ user: User; stats: PassportStatsResult } | null> {
    const user = [...this.users.values()].find((u) => u.login.toLowerCase() === login.toLowerCase());
    if (!user) return null;
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
    for (const s of solutions) if (!this.solutions.has(s.id)) this.solutions.set(s.id, { ...structuredClone(s), createdAt: new Date() });
  }

  async findSolutionCandidates(words: string[], limit: number): Promise<Solution[]> {
    if (!words.length) {
      return [...this.solutions.values()].slice(0, limit).map((s) => structuredClone(s));
    }
    const wanted = new Set(words);
    return [...this.solutions.values()]
      .filter((s) => solutionWords(`${s.title} ${s.error} ${s.cause} ${s.fix}`, 1000).some((w) => wanted.has(w)))
      .slice(0, limit)
      .map((s) => structuredClone(s));
  }

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

  /** Coupe d'Afrique Francophone (CAF) methods */
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
    const result = { requests: 0, sessions: 0 };
    for (const [id, r] of this.requests) if (r.expiresAt <= now && this.requests.delete(id)) result.requests++;
    for (const [hash, s] of this.sessions) if (s.expiresAt <= now && this.sessions.delete(hash)) result.sessions++;
    return result;
  }

  async close(): Promise<void> {}
}

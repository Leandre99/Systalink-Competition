import type { CafEvalCriterion, CafEventStatus, SosRequest } from '@sos/shared';

export type { CafEvalCriterion, CafEventStatus };


export interface CafEventItem {
  id: string;
  title: string;
  theme: string;
  rules: string;
  startDate: Date;
  endDate: Date;
  status: CafEventStatus;
  organizerId: string;
  juryLogins: string[];
  criteria: CafEvalCriterion[];
  createdAt: Date;
}

export interface CafTeamMemberItem {
  userId: string;
  country: string;
  role: string;
}

export interface CafTeamItem {
  id: string;
  eventId: string;
  name: string;
  region: string;
  leaderId: string;
  members: CafTeamMemberItem[];
  createdAt: Date;
}

export interface CafTeamJoinItem {
  id: string;
  teamId: string;
  applicantId: string;
  country: string;
  role: string;
  message: string;
  status: 'en_attente' | 'acceptee' | 'refusee';
  createdAt: Date;
}

export interface CafChallengeItem {
  id: string;
  eventId: string;
  title: string;
  description: string;
  durationHours: number;
  tech: string[];
}

export interface CafSubmissionItem {
  id: string;
  eventId: string;
  challengeId: string;
  teamId: string;
  repositoryUrl: string;
  demoUrl: string;
  presentation: string;
  submittedAt: Date;
}

export interface CafEvaluationItem {
  id: string;
  eventId: string;
  submissionId: string;
  juryId: string;
  scores: Record<string, number>;
  comments?: string | null;
  evaluatedAt: Date;
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
  /** Open (not accepted, not closed, not expired) requests, oldest first. */
  listOpenRequests(now: Date): Promise<StoredRequest[]>;
  /** Atomic: only the first helper wins. Returns null if the request is no longer open. */
  acceptRequest(id: string, helperId: string, now: Date): Promise<StoredRequest | null>;
  /** Closes an open or accepted request of this user. Returns false if there was nothing to close. */
  closeRequest(id: string, userId: string): Promise<boolean>;
  /** « Problème résolu » by the requester or the helper of an accepted request: the code is erased now. */
  resolveRequest(id: string, userId: string, now: Date): Promise<boolean>;
  getUser(id: string): Promise<User | null>;
  setHelperTech(userId: string, tech: string[]): Promise<void>;
  getHelperTech(userId: string): Promise<string[]>;
  createSolutionDraft(input: Omit<SolutionDraft, 'requesterApproved' | 'helperApproved' | 'published'>): Promise<SolutionDraft>;
  getSolutionDraft(requestId: string, userId?: string): Promise<SolutionDraft | null>;
  updateSolutionDraft(requestId: string, userId: string, update: { title?: string; cause?: string; fix?: string }): Promise<SolutionDraft | null>;
  approveSolutionDraft(requestId: string, userId: string): Promise<SolutionDraft | null>;
  getPassportStats(userId: string): Promise<PassportStatsResult>;
  revokePassportProof(userId: string, proofId: string, revoked: boolean): Promise<boolean>;
  getPublicPassport(login: string): Promise<{ user: User; stats: PassportStatsResult } | null>;
  /** Inserts the sheets that do not exist yet (by id). */
  seedSolutions(solutions: NewSolution[]): Promise<void>;
  /** Sheets containing at least one of these lowercase words (scoring is done by the caller). */
  findSolutionCandidates(words: string[], limit: number): Promise<Solution[]>;
  /** Projects showcase methods */
  createProject(input: NewProjectInput): Promise<ProjectShowcaseItem>;
  updateProject(id: string, userId: string, update: Partial<NewProjectInput>): Promise<ProjectShowcaseItem | null>;
  publishProject(id: string, userId: string, published: boolean): Promise<ProjectShowcaseItem | null>;
  deleteProject(id: string, userId: string): Promise<boolean>;
  getProject(id: string, userId?: string): Promise<ProjectShowcaseItem | null>;
  listProjects(filter?: { tech?: string[]; status?: ProjectStatus; search?: string }, userId?: string): Promise<ProjectShowcaseItem[]>;
  createJoinRequest(projectId: string, applicantId: string, message: string): Promise<ProjectJoinItem | null>;
  listJoinRequests(projectId: string, ownerId: string): Promise<ProjectJoinItem[]>;
  getUserJoinRequest(projectId: string, applicantId: string): Promise<ProjectJoinItem | null>;
  respondJoinRequest(requestId: string, ownerId: string, status: 'acceptee' | 'refusee'): Promise<ProjectJoinItem | null>;
  isProjectMember(projectId: string, userId: string): Promise<boolean>;
  listTasks(projectId: string, userId: string): Promise<ProjectTaskItem[]>;
  createTask(projectId: string, userId: string, title: string): Promise<ProjectTaskItem | null>;
  updateTask(projectId: string, taskId: string, userId: string, update: { title?: string; status?: TaskStatus }): Promise<ProjectTaskItem | null>;
  /** Moderation & Reports methods */
  createReport(input: NewReportInput): Promise<ReportItem>;
  hasRecentReport(reporterId: string, targetType: ReportTargetType, targetId: string): Promise<boolean>;
  countReportsSince(reporterId: string, since: Date): Promise<number>;
  listReports(status?: ReportStatus): Promise<ReportItem[]>;
  resolveReport(reportId: string, status: 'traite' | 'rejete'): Promise<ReportItem | null>;
  /** Coupe d'Afrique Francophone (CAF) methods */
  createCafEvent(input: Omit<CafEventItem, 'id' | 'createdAt'>): Promise<CafEventItem>;
  getCafEvent(id: string): Promise<CafEventItem | null>;
  listCafEvents(status?: CafEventStatus): Promise<CafEventItem[]>;
  updateCafEventStatus(id: string, status: CafEventStatus): Promise<CafEventItem | null>;
  createCafTeam(input: Omit<CafTeamItem, 'id' | 'createdAt'>): Promise<CafTeamItem>;
  getCafTeam(id: string): Promise<CafTeamItem | null>;
  listCafTeams(eventId: string): Promise<CafTeamItem[]>;
  createCafTeamJoinRequest(teamId: string, applicantId: string, country: string, role: string, message: string): Promise<CafTeamJoinItem | null>;
  listCafTeamJoinRequests(teamId: string, leaderId: string): Promise<CafTeamJoinItem[]>;
  respondCafTeamJoinRequest(requestId: string, leaderId: string, status: 'acceptee' | 'refusee'): Promise<CafTeamJoinItem | null>;
  createCafChallenge(input: Omit<CafChallengeItem, 'id'>): Promise<CafChallengeItem>;
  listCafChallenges(eventId: string): Promise<CafChallengeItem[]>;
  createCafSubmission(input: Omit<CafSubmissionItem, 'id' | 'submittedAt'>): Promise<CafSubmissionItem | null>;
  listCafSubmissions(eventId: string): Promise<CafSubmissionItem[]>;
  createCafEvaluation(input: Omit<CafEvaluationItem, 'id' | 'evaluatedAt'>): Promise<CafEvaluationItem>;
  listCafEvaluations(eventId: string): Promise<CafEvaluationItem[]>;
  purgeExpired(now: Date): Promise<PurgeResult>;
  close(): Promise<void>;
}

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

export type RequestStatus = 'ouverte' | 'acceptee' | 'resolue' | 'fermee';

export interface StoredRequest {
  id: string;
  userId: string;
  status: RequestStatus;
  tech: string[];
  command: string;
  exitCode: number;
  payload: SosRequest;
  helperId: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface NewRequest {
  userId: string;
  payload: SosRequest;
  createdAt: Date;
  expiresAt: Date;
}

export interface Solution {
  id: string;
  title: string;
  error: string;
  cause: string;
  fix: string;
  tech: string[];
  createdAt: Date;
}

export type NewSolution = Omit<Solution, 'createdAt'>;

export interface SolutionDraft {
  id: string;
  requestId: string;
  title: string;
  error: string;
  cause: string;
  fix: string;
  tech: string[];
  requesterApproved: boolean;
  helperApproved: boolean;
  published: boolean;
}

export interface PurgeResult {
  requests: number;
  sessions: number;
}

export type ProjectStatus = 'ouvert' | 'ferme';

export interface ProjectShowcaseItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  tech: string[];
  repositoryUrl?: string | null;
  demoUrl?: string | null;
  rolesNeeded: string[];
  status: ProjectStatus;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewProjectInput = Omit<ProjectShowcaseItem, 'id' | 'createdAt' | 'updatedAt'>;

export type JoinRequestStatus = 'en_attente' | 'acceptee' | 'refusee';

export interface ProjectJoinItem {
  id: string;
  projectId: string;
  applicantId: string;
  message: string;
  status: JoinRequestStatus;
  createdAt: Date;
}

export type TaskStatus = 'a_faire' | 'en_cours' | 'termine';

export interface ProjectTaskItem {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  createdById: string;
  createdAt: Date;
}

export type ReportReason = 'pas_clair' | 'doublon' | 'inapproprie';
export type ReportTargetType = 'fiche_solution' | 'demande_sos' | 'projet' | 'autre';
export type ReportStatus = 'en_attente' | 'traite' | 'rejete';

export interface ReportItem {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
}

export type NewReportInput = Omit<ReportItem, 'id' | 'status' | 'createdAt'>;

export interface PassportProofItem {
  id: string;
  requestId: string;
  confirmedAt: Date;
  tech: string[];
  proofHash: string;
  summary: string;
  revoked: boolean;
}

export interface PassportStatsResult {
  helpsConfirmed: number;
  points: number;
  hasConfirmedBadge: boolean;
  averageResolutionMinutes: number | null;
  technologies: string[];
  proofs: PassportProofItem[];
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
  /** Open (not accepted, not closed, not expired) requests, oldest first. */
  listOpenRequests(now: Date): Promise<StoredRequest[]>;
  /** Atomic: only the first helper wins. Returns null if the request is no longer open. */
  acceptRequest(id: string, helperId: string, now: Date): Promise<StoredRequest | null>;
  /** Closes an open or accepted request of this user. Returns false if there was nothing to close. */
  closeRequest(id: string, userId: string): Promise<boolean>;
  /** « Problème résolu » by the requester or the helper of an accepted request: the code is erased now. */
  resolveRequest(id: string, userId: string, now: Date): Promise<boolean>;
  getUser(id: string): Promise<User | null>;
  setHelperTech(userId: string, tech: string[]): Promise<void>;
  getHelperTech(userId: string): Promise<string[]>;
  createSolutionDraft(input: Omit<SolutionDraft, 'requesterApproved' | 'helperApproved' | 'published'>): Promise<SolutionDraft>;
  getSolutionDraft(requestId: string, userId?: string): Promise<SolutionDraft | null>;
  updateSolutionDraft(requestId: string, userId: string, update: { title?: string; cause?: string; fix?: string }): Promise<SolutionDraft | null>;
  approveSolutionDraft(requestId: string, userId: string): Promise<SolutionDraft | null>;
  getPassportStats(userId: string): Promise<PassportStatsResult>;
  revokePassportProof(userId: string, proofId: string, revoked: boolean): Promise<boolean>;
  getPublicPassport(login: string): Promise<{ user: User; stats: PassportStatsResult } | null>;
  /** Inserts the sheets that do not exist yet (by id). */
  seedSolutions(solutions: NewSolution[]): Promise<void>;
  /** Sheets containing at least one of these lowercase words (scoring is done by the caller). */
  findSolutionCandidates(words: string[], limit: number): Promise<Solution[]>;
  /** Projects showcase methods */
  createProject(input: NewProjectInput): Promise<ProjectShowcaseItem>;
  updateProject(id: string, userId: string, update: Partial<NewProjectInput>): Promise<ProjectShowcaseItem | null>;
  publishProject(id: string, userId: string, published: boolean): Promise<ProjectShowcaseItem | null>;
  deleteProject(id: string, userId: string): Promise<boolean>;
  getProject(id: string, userId?: string): Promise<ProjectShowcaseItem | null>;
  listProjects(filter?: { tech?: string[]; status?: ProjectStatus; search?: string }, userId?: string): Promise<ProjectShowcaseItem[]>;
  createJoinRequest(projectId: string, applicantId: string, message: string): Promise<ProjectJoinItem | null>;
  listJoinRequests(projectId: string, ownerId: string): Promise<ProjectJoinItem[]>;
  getUserJoinRequest(projectId: string, applicantId: string): Promise<ProjectJoinItem | null>;
  respondJoinRequest(requestId: string, ownerId: string, status: 'acceptee' | 'refusee'): Promise<ProjectJoinItem | null>;
  isProjectMember(projectId: string, userId: string): Promise<boolean>;
  listTasks(projectId: string, userId: string): Promise<ProjectTaskItem[]>;
  createTask(projectId: string, userId: string, title: string): Promise<ProjectTaskItem | null>;
  updateTask(projectId: string, taskId: string, userId: string, update: { title?: string; status?: TaskStatus }): Promise<ProjectTaskItem | null>;
  /** Moderation & Reports methods */
  createReport(input: NewReportInput): Promise<ReportItem>;
  hasRecentReport(reporterId: string, targetType: ReportTargetType, targetId: string): Promise<boolean>;
  countReportsSince(reporterId: string, since: Date): Promise<number>;
  listReports(status?: ReportStatus): Promise<ReportItem[]>;
  resolveReport(reportId: string, status: 'traite' | 'rejete'): Promise<ReportItem | null>;
  purgeExpired(now: Date): Promise<PurgeResult>;
  close(): Promise<void>;
}

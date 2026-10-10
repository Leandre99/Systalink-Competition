import type { SosRequest } from './request.js';

export interface PublicUser {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  provider: 'github' | 'dev';
}

export interface PassportProof {
  id: string;
  requestId: string;
  confirmedAt: string;
  tech: string[];
  proofHash: string;
  summary: string;
  revoked: boolean;
}

export interface Passport {
  user: PublicUser;
  helpsConfirmed: number;
  points: number;
  hasConfirmedBadge: boolean;
  averageResolutionMinutes: number | null;
  technologies: string[];
  proofs: PassportProof[];
  shareUrl?: string;
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

/** resolue : the room ended with « Problème résolu » (the code is erased at that moment). */
export type RequestStatus = 'ouverte' | 'acceptee' | 'resolue' | 'fermee';

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

export type ProjectStatus = 'ouvert' | 'ferme';

export interface ShowcaseProject {
  id: string;
  userId: string;
  author: PublicUser;
  name: string;
  description: string;
  tech: string[];
  repositoryUrl?: string | null;
  demoUrl?: string | null;
  rolesNeeded: string[];
  status: ProjectStatus;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JoinRequestStatus = 'en_attente' | 'acceptee' | 'refusee';

export interface ProjectJoinRequest {
  id: string;
  projectId: string;
  applicant: PublicUser;
  message: string;
  status: JoinRequestStatus;
  createdAt: string;
}

export type TaskStatus = 'a_faire' | 'en_cours' | 'termine';

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  createdBy: PublicUser;
  createdAt: string;
}

export type ReportReason = 'pas_clair' | 'doublon' | 'inapproprie';
export type ReportTargetType = 'fiche_solution' | 'demande_sos' | 'projet' | 'autre';
export type ReportStatus = 'en_attente' | 'traite' | 'rejete';

export interface Report {
  id: string;
  reporter: PublicUser;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt: string;
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
  | { type: 'accepter'; requestId: string }
  // Salle SOS : only the requester and the helper of an accepted request.
  | { type: 'rejoindre'; requestId: string; client: SalleClient }
  | { type: 'yjs'; requestId: string; update: string }
  | { type: 'message'; requestId: string; text: string }
  | { type: 'proposer'; requestId: string }
  | { type: 'relance'; requestId: string }
  | { type: 'resolu'; requestId: string }
  // Sent by the requester's terminal only.
  | { type: 'terminal'; requestId: string; data: string }
  | { type: 'execution'; requestId: string; state: 'en-cours' | 'terminee'; exitCode?: number }
  | { type: 'reponse'; requestId: string; path: string; accepted: boolean; reason?: string }
  | { type: 'reponse-relance'; requestId: string; accepted: boolean };

export type ServerMessage =
  | { type: 'bienvenue'; user: PublicUser }
  | { type: 'alerte'; alert: RadarAlert }
  | { type: 'retirer'; requestId: string; raison: 'prise' | 'fermee' | 'expiree' }
  | { type: 'statut'; requestId: string; stage: RadarStage; alerted: number; online: number }
  | { type: 'acceptee'; requestId: string; helper: PublicUser }
  | { type: 'prise'; requestId: string; requester: PublicUser }
  | { type: 'fermee'; requestId: string }
  | { type: 'erreur'; message: string }
  | { type: 'salle'; salle: SalleState }
  | { type: 'yjs'; requestId: string; update: string }
  | { type: 'message'; requestId: string; message: ChatMessage }
  | { type: 'terminal'; requestId: string; data: string }
  | { type: 'execution'; requestId: string; state: 'en-cours' | 'terminee'; exitCode: number | null }
  | { type: 'presence'; requestId: string; members: SalleMember[] }
  | { type: 'proposition'; requestId: string; by: string }
  | { type: 'relance-demandee'; requestId: string; by: string }
  | { type: 'salle-fermee'; requestId: string; raison: 'resolue' | 'annulee' | 'expiree'; by?: string };

/** `terminal` = the `sos` command on the requester's machine; `web` = the browser. */
export type SalleClient = 'terminal' | 'web';
export type SalleRole = 'demandeur' | 'aidant';

export interface SalleMember {
  login: string;
  role: SalleRole;
  client: SalleClient;
}

/** `systeme` messages are written by the server (corrections accepted, relaunches…). */
export interface ChatMessage {
  id: number;
  from: string;
  role: SalleRole | 'systeme';
  text: string;
  at: string;
}

export interface SalleFile {
  path: string;
  line?: number;
}

export interface SalleState {
  requestId: string;
  role: SalleRole;
  requester: PublicUser;
  helper: PublicUser;
  command: string;
  tech: string[];
  errorSummary: string;
  /** Shared files: one Y.Text per path in the Yjs document. */
  files: SalleFile[];
  /** Full Yjs document (base64). Clients must start from a fresh Y.Doc. */
  doc: string;
  chat: ChatMessage[];
  /** Terminal output shown read-only in the room (already masked). */
  terminal: string;
  running: boolean;
  lastExitCode: number | null;
  members: SalleMember[];
  /** Web page of the room. */
  url: string;
  expiresAt: string;
}

/** Module Coupe d'Afrique Francophone (CAF) */
export type CafEventStatus = 'brouillon' | 'inscriptions' | 'en_cours' | 'termine';

export interface CafEvalCriterion {
  key: string;
  label: string;
  maxScore: number;
}

export interface CafEvent {
  id: string;
  title: string;
  theme: string;
  rules: string;
  startDate: string;
  endDate: string;
  status: CafEventStatus;
  organizer: PublicUser;
  juryLogins: string[];
  criteria: CafEvalCriterion[];
  createdAt: string;
}

export interface CafTeamMember {
  user: PublicUser;
  country: string;
  role: string;
}

export interface CafTeam {
  id: string;
  eventId: string;
  name: string;
  region: string;
  leader: PublicUser;
  members: CafTeamMember[];
  createdAt: string;
}

export interface CafTeamJoinRequest {
  id: string;
  teamId: string;
  applicant: PublicUser;
  country: string;
  role: string;
  message: string;
  status: 'en_attente' | 'acceptee' | 'refusee';
  createdAt: string;
}

export interface CafChallenge {
  id: string;
  eventId: string;
  title: string;
  description: string;
  durationHours: number;
  tech: string[];
}

export interface CafSubmission {
  id: string;
  eventId: string;
  challengeId: string;
  teamId: string;
  teamName: string;
  repositoryUrl: string;
  demoUrl: string;
  presentation: string;
  submittedAt: string;
}

export interface CafEvaluation {
  id: string;
  eventId: string;
  submissionId: string;
  jury: PublicUser;
  scores: Record<string, number>;
  comments?: string;
  evaluatedAt: string;
}

export interface CafTeamRanking {
  rank: number;
  teamId: string;
  teamName: string;
  region: string;
  countries: string[];
  totalScore: number;
  criteriaScores: Record<string, number>;
}

import type { CafChallenge, CafEvalCriterion, CafEvaluation, CafEvent, CafEventStatus, CafSubmission, CafTeam, CafTeamJoinRequest, CafTeamRanking, ClientMessage, Passport, ProjectJoinRequest, ProjectTask, PublicUser, Report, ReportReason, ReportStatus, ReportTargetType, ServerMessage, SessionResponse, ShowcaseProject, SolutionDraft, SolutionHit } from '@sos/shared';


const TOKEN_KEY = 'sos.token';

export const savedToken = () => localStorage.getItem(TOKEN_KEY);
export const forgetToken = () => localStorage.removeItem(TOKEN_KEY);

async function call<T>(method: string, route: string, body?: unknown, token?: string | null): Promise<T> {
  const response = await fetch(`/api${route}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : `Erreur ${response.status}`);
  return data as T;
}

export async function loginDev(login: string): Promise<SessionResponse> {
  const session = await call<SessionResponse>('POST', '/auth/dev', { login });
  localStorage.setItem(TOKEN_KEY, session.token);
  return session;
}

export const me = (token: string) => call<PublicUser>('GET', '/me', undefined, token);
export const passport = (token: string) => call<Passport>('GET', '/me/passport', undefined, token);
export const revokePassportProof = (token: string, proofId: string, revoked: boolean) =>
  call<{ success: boolean }>('POST', `/me/passport/proofs/${encodeURIComponent(proofId)}/revoke`, { revoked }, token);
export const getPublicPassport = (login: string) => call<Passport>('GET', `/passport/public/${encodeURIComponent(login)}`);
export const logout = (token: string) => call<void>('POST', '/auth/logout', undefined, token).finally(forgetToken);
export const searchSolutions = (query: string, tech: string[]) =>
  call<SolutionHit[]>(`GET`, `/solutions/search?q=${encodeURIComponent(query)}&tech=${encodeURIComponent(tech.join(','))}`);
export const getSolutionDraft = (token: string, requestId: string) => call<SolutionDraft | null>('GET', `/solutions/drafts/${requestId}`, undefined, token);
export const updateSolutionDraft = (token: string, requestId: string, update: { title?: string; cause?: string; fix?: string }) => call<SolutionDraft>('POST', `/solutions/drafts/${requestId}/update`, update, token);
export const approveSolutionDraft = (token: string, requestId: string) => call<SolutionDraft>('POST', `/solutions/drafts/${requestId}/approve`, undefined, token);

export interface DiscoverData {
  solutions: SolutionHit[];
  openRequests: Array<{
    id: string;
    status: string;
    tech: string[];
    command: string;
    exitCode: number;
    files: number;
    createdAt: string;
    expiresAt: string;
  }>;
  availableHelpers: Array<{
    id: string;
    login: string;
    name: string | null;
    avatarUrl: string | null;
    tech: string[];
  }>;
}

export const getDiscoverData = (token: string, query: string, tech: string[]) =>
  call<DiscoverData>('GET', `/discover?q=${encodeURIComponent(query)}&tech=${encodeURIComponent(tech.join(','))}`, undefined, token);

export const createRequest = (token: string, request: unknown) => call<{ id: string }>('POST', '/requests', request, token);

export const listProjects = (token?: string | null, search?: string, tech?: string[], status?: string) => {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (tech?.length) params.set('tech', tech.join(','));
  if (status) params.set('status', status);
  return call<ShowcaseProject[]>('GET', `/projects?${params.toString()}`, undefined, token);
};

export const getProject = (token: string | null, id: string) => call<ShowcaseProject>('GET', `/projects/${id}`, undefined, token);
export const createProject = (token: string, project: unknown) => call<ShowcaseProject>('POST', '/projects', project, token);
export const updateProject = (token: string, id: string, project: unknown) => call<ShowcaseProject>('PATCH', `/projects/${id}`, project, token);
export const publishProject = (token: string, id: string, published: boolean) => call<ShowcaseProject>('POST', `/projects/${id}/publish`, { published }, token);
export const deleteProject = (token: string, id: string) => call<void>('DELETE', `/projects/${id}`, undefined, token);
export const joinProject = (token: string, id: string, message: string) => call<ProjectJoinRequest>('POST', `/projects/${id}/join`, { message }, token);
export const listJoinRequests = (token: string, projectId: string) => call<ProjectJoinRequest[]>('GET', `/projects/${projectId}/applications`, undefined, token);
export const getUserJoinRequest = (token: string, projectId: string) => call<ProjectJoinRequest | null>('GET', `/projects/${projectId}/my-application`, undefined, token);
export const respondJoinRequest = (token: string, projectId: string, appId: string, status: 'acceptee' | 'refusee') =>
  call<ProjectJoinRequest>('POST', `/projects/${projectId}/applications/${appId}/respond`, { status }, token);

export const listProjectTasks = (token: string, projectId: string) => call<ProjectTask[]>('GET', `/projects/${projectId}/tasks`, undefined, token);
export const createProjectTask = (token: string, projectId: string, title: string) => call<ProjectTask>('POST', `/projects/${projectId}/tasks`, { title }, token);
export const updateProjectTask = (token: string, projectId: string, taskId: string, update: { title?: string; status?: 'a_faire' | 'en_cours' | 'termine' }) =>
  call<ProjectTask>('PATCH', `/projects/${projectId}/tasks/${taskId}`, update, token);

export const createReport = (token: string, payload: { targetType: ReportTargetType; targetId: string; reason: ReportReason; details?: string; confirmed: boolean }) =>
  call<{ report: Report }>('POST', '/reports', payload, token);

export const listReports = (token: string, status?: ReportStatus) =>
  call<Report[]>('GET', `/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`, undefined, token);

export const resolveReport = (token: string, reportId: string, status: 'traite' | 'rejete') =>
  call<{ report: Report }>('POST', `/reports/${reportId}/resolve`, { status }, token);

export function connectRadar(token: string, onMessage: (m: ServerMessage) => void, onClose: () => void) {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  const send = (m: ClientMessage) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));
  ws.onopen = () => send({ type: 'auth', token });
  ws.onmessage = (event) => onMessage(JSON.parse(String(event.data)) as ServerMessage);
  ws.onclose = onClose;
  return { send, close: () => ws.close() };
}

// Coupe d'Afrique Francophone (CAF) API
export const listCafEvents = (token?: string | null) => call<CafEvent[]>('GET', '/caf/events', undefined, token);
export const getCafEvent = (eventId: string, token?: string | null) => call<CafEvent>('GET', `/caf/events/${eventId}`, undefined, token);
export const createCafEvent = (token: string, data: { title: string; theme: string; rules: string; startDate: string; endDate: string; evalCriteria: CafEvalCriterion[] }) =>
  call<CafEvent>('POST', '/caf/events', data, token);
export const updateCafEventStatus = (token: string, eventId: string, status: CafEventStatus) =>
  call<CafEvent>('POST', `/caf/events/${eventId}/status`, { status }, token);

export const listCafTeams = (eventId: string, token?: string | null) => call<CafTeam[]>('GET', `/caf/events/${eventId}/teams`, undefined, token);
export const createCafTeam = (token: string, eventId: string, data: { name: string; region: string; description?: string }) =>
  call<CafTeam>('POST', `/caf/events/${eventId}/teams`, data, token);
export const joinCafTeam = (token: string, teamId: string, message?: string) =>
  call<CafTeamJoinRequest>('POST', `/caf/teams/${teamId}/join`, { message }, token);
export const listCafTeamApplications = (token: string, teamId: string) =>
  call<CafTeamJoinRequest[]>('GET', `/caf/teams/${teamId}/applications`, undefined, token);
export const respondCafTeamApplication = (token: string, teamId: string, appId: string, status: 'acceptee' | 'refusee') =>
  call<CafTeamJoinRequest>('POST', `/caf/teams/${teamId}/applications/${appId}/respond`, { status }, token);

export const listCafChallenges = (eventId: string, token?: string | null) => call<CafChallenge[]>('GET', `/caf/events/${eventId}/challenges`, undefined, token);
export const createCafChallenge = (token: string, eventId: string, data: { title: string; description: string; durationHours: number; tech: string[] }) =>
  call<CafChallenge>('POST', `/caf/events/${eventId}/challenges`, data, token);

export const listCafSubmissions = (challengeId: string, token?: string | null) => call<CafSubmission[]>('GET', `/caf/challenges/${challengeId}/submissions`, undefined, token);
export const createCafSubmission = (token: string, challengeId: string, data: { teamId: string; repositoryUrl: string; demoUrl: string; presentation: string }) =>
  call<CafSubmission>('POST', `/caf/challenges/${challengeId}/submissions`, data, token);

export const evaluateCafSubmission = (token: string, submissionId: string, payload: { scores: Record<string, number>; comments?: string }) =>
  call<CafEvaluation>('POST', `/caf/submissions/${submissionId}/evaluations`, payload, token);

export const getCafResults = (eventId: string, token?: string | null) => call<CafTeamRanking[]>('GET', `/caf/events/${eventId}/results`, undefined, token);



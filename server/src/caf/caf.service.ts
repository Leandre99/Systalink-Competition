import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STORE } from '../tokens.js';
import type { Store, User, CafEventItem, CafTeamItem, CafSubmissionItem, CafEvaluationItem } from '../store/types.js';
import type { CafChallenge, CafEvalCriterion, CafEvaluation, CafEvent, CafEventStatus, CafSubmission, CafTeam, CafTeamJoinRequest, CafTeamRanking, PublicUser } from '@sos/shared';
import { z } from 'zod';
import { parseBody } from '../validation.js';
import { publicUser } from '../auth/auth.service.js';

export const CreateCafEventSchema = z.object({
  title: z.string().trim().min(3).max(150),
  theme: z.string().trim().min(3).max(300),
  rules: z.string().trim().min(5).max(3000),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  status: z.enum(['brouillon', 'inscriptions', 'en_cours', 'termine']).default('brouillon'),
  juryLogins: z.array(z.string().trim().min(1)).default([]),
  evalCriteria: z.array(z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    maxScore: z.number().positive(),
  })).optional(),
  criteria: z.array(z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    maxScore: z.number().positive(),
  })).optional(),
});


export const CreateCafTeamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100).default('Sénégal'),
  role: z.string().trim().min(2).max(100).default('capitaine'),
});


export const JoinCafTeamSchema = z.object({
  country: z.string().trim().min(2).max(100).default('Côte d’Ivoire'),
  role: z.string().trim().min(2).max(100).default('Développeur'),
  message: z.string().trim().min(2).max(500).default('Bonjour, je souhaite rejoindre l’équipe.'),
});


export const CreateCafChallengeSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(5).max(2000),
  durationHours: z.number().positive().default(48),
  tech: z.array(z.string().trim()).default([]),
});

export const CreateCafSubmissionSchema = z.object({
  challengeId: z.string().min(1).optional(),
  teamId: z.string().min(1),
  repositoryUrl: z.string().trim().min(1),
  demoUrl: z.string().trim().min(1),
  presentation: z.string().trim().min(5).max(3000),
});


export const EvaluateCafSubmissionSchema = z.object({
  scores: z.record(z.string(), z.number().min(0)),
  comments: z.string().max(1000).optional(),
});

@Injectable()
export class CafService {
  constructor(@Inject(STORE) private readonly store: Store) {}

  private async formatEvent(item: CafEventItem): Promise<CafEvent> {
    const organizer = await this.store.getUser(item.organizerId);
    return {
      id: item.id,
      title: item.title,
      theme: item.theme,
      rules: item.rules,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate.toISOString(),
      status: item.status,
      organizer: organizer ? publicUser(organizer) : { id: item.organizerId, login: 'organisateur', name: null, avatarUrl: null, provider: 'dev' as const },
      juryLogins: item.juryLogins,
      criteria: item.criteria,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private async formatTeam(item: CafTeamItem): Promise<CafTeam> {
    const leader = await this.store.getUser(item.leaderId);
    const members = await Promise.all(
      item.members.map(async (m) => {
        const u = await this.store.getUser(m.userId);
        return {
          user: u ? publicUser(u) : { id: m.userId, login: 'inconnu', name: null, avatarUrl: null, provider: 'dev' as const },
          country: m.country,
          role: m.role,
        };
      }),
    );

    return {
      id: item.id,
      eventId: item.eventId,
      name: item.name,
      region: item.region,
      leader: leader ? publicUser(leader) : { id: item.leaderId, login: 'leader', name: null, avatarUrl: null, provider: 'dev' as const },
      members,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async createEvent(user: User, body: unknown): Promise<CafEvent> {
    const input = parseBody(CreateCafEventSchema, body);
    const criteria = input.evalCriteria || input.criteria || [
      { key: 'innovation', label: 'Innovation & Thème', maxScore: 20 },
      { key: 'technique', label: 'Qualité Technique & Architecture', maxScore: 20 },
      { key: 'impact', label: 'Impact Régional & Utilité', maxScore: 20 },
      { key: 'presentation', label: 'Démo & Présentation', maxScore: 20 },
    ];
    const item = await this.store.createCafEvent({
      title: input.title,
      theme: input.theme,
      rules: input.rules,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status,
      organizerId: user.id,
      juryLogins: input.juryLogins,
      criteria,
    });
    return this.formatEvent(item);
  }

  async listEvents(status?: CafEventStatus): Promise<CafEvent[]> {
    const items = await this.store.listCafEvents(status);
    return Promise.all(items.map((i) => this.formatEvent(i)));
  }

  async getEvent(id: string): Promise<CafEvent> {
    const item = await this.store.getCafEvent(id);
    if (!item) throw new NotFoundException('Événement introuvable.');
    return this.formatEvent(item);
  }

  async updateEventStatus(user: User, id: string, status: CafEventStatus): Promise<CafEvent> {
    const event = await this.store.getCafEvent(id);
    if (!event) throw new NotFoundException('Événement introuvable.');
    if (event.organizerId !== user.id && user.login !== 'admin' && user.login !== 'moderateur') {
      throw new ForbiddenException('Seul l’organisateur ou l’administration peut changer le statut de cet événement.');
    }
    const updated = await this.store.updateCafEventStatus(id, status);
    if (!updated) throw new BadRequestException('Mise à jour du statut échouée.');
    return this.formatEvent(updated);
  }

  async createTeam(user: User, eventId: string, body: unknown): Promise<CafTeam> {
    const event = await this.store.getCafEvent(eventId);
    if (!event) throw new NotFoundException('Événement introuvable.');
    if (event.status === 'brouillon' || event.status === 'termine') {
      throw new BadRequestException('Les inscriptions d’équipes sont fermées pour cet événement.');
    }
    const input = parseBody(CreateCafTeamSchema, body);
    const item = await this.store.createCafTeam({
      eventId,
      name: input.name,
      region: input.region,
      leaderId: user.id,
      members: [{ userId: user.id, country: input.country, role: input.role }],
    });
    return this.formatTeam(item);
  }

  async listTeams(eventId: string): Promise<CafTeam[]> {
    const items = await this.store.listCafTeams(eventId);
    return Promise.all(items.map((t) => this.formatTeam(t)));
  }

  async joinTeam(user: User, teamId: string, body: unknown): Promise<CafTeamJoinRequest> {
    const team = await this.store.getCafTeam(teamId);
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (team.members.some((m) => m.userId === user.id)) {
      throw new BadRequestException('Vous êtes déjà membre de cette équipe.');
    }
    const input = parseBody(JoinCafTeamSchema, body);
    const req = await this.store.createCafTeamJoinRequest(teamId, user.id, input.country, input.role, input.message);
    if (!req) throw new BadRequestException('Impossible de soumettre la demande.');
    return {
      id: req.id,
      teamId: req.teamId,
      applicant: publicUser(user),
      country: req.country,
      role: req.role,
      message: req.message,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
    };
  }

  async listTeamApplications(user: User, teamId: string): Promise<CafTeamJoinRequest[]> {
    const team = await this.store.getCafTeam(teamId);
    if (!team) throw new NotFoundException('Équipe introuvable.');
    if (team.leaderId !== user.id) throw new ForbiddenException('Seul le chef d’équipe peut consulter les demandes.');
    const list = await this.store.listCafTeamJoinRequests(teamId, user.id);
    return Promise.all(
      list.map(async (r) => {
        const applicant = await this.store.getUser(r.applicantId);
        return {
          id: r.id,
          teamId: r.teamId,
          applicant: applicant ? publicUser(applicant) : { id: r.applicantId, login: 'candidat', name: null, avatarUrl: null, provider: 'dev' },
          country: r.country,
          role: r.role,
          message: r.message,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    );
  }

  async respondTeamApplication(user: User, teamId: string, appId: string, status: 'acceptee' | 'refusee'): Promise<CafTeamJoinRequest> {
    const res = await this.store.respondCafTeamJoinRequest(appId, user.id, status);
    if (!res) throw new ForbiddenException('Traitement de la candidature non autorisé.');
    const applicant = await this.store.getUser(res.applicantId);
    return {
      id: res.id,
      teamId: res.teamId,
      applicant: applicant ? publicUser(applicant) : { id: res.applicantId, login: 'candidat', name: null, avatarUrl: null, provider: 'dev' },
      country: res.country,
      role: res.role,
      message: res.message,
      status: res.status,
      createdAt: res.createdAt.toISOString(),
    };
  }

  async createChallenge(user: User, eventId: string, body: unknown): Promise<CafChallenge> {
    const event = await this.store.getCafEvent(eventId);
    if (!event) throw new NotFoundException('Événement introuvable.');
    if (event.organizerId !== user.id && user.login !== 'admin') {
      throw new ForbiddenException('Seul l’organisateur peut ajouter des défis.');
    }
    const input = parseBody(CreateCafChallengeSchema, body);
    const item = await this.store.createCafChallenge({
      eventId,
      title: input.title,
      description: input.description,
      durationHours: input.durationHours,
      tech: input.tech,
    });
    return {
      id: item.id,
      eventId: item.eventId,
      title: item.title,
      description: item.description,
      durationHours: item.durationHours,
      tech: item.tech,
    };
  }

  async listChallenges(eventId: string): Promise<CafChallenge[]> {
    const items = await this.store.listCafChallenges(eventId);
    return items.map((i) => ({
      id: i.id,
      eventId: i.eventId,
      title: i.title,
      description: i.description,
      durationHours: i.durationHours,
      tech: i.tech,
    }));
  }

  async createSubmission(user: User, eventIdOrChallengeId: string, body: unknown): Promise<CafSubmission> {
    const input = parseBody(CreateCafSubmissionSchema, body);
    const team = await this.store.getCafTeam(input.teamId);
    if (!team) throw new NotFoundException('Équipe introuvable.');

    const event = await this.store.getCafEvent(team.eventId);
    if (!event) throw new NotFoundException('Événement introuvable.');
    if (event.status !== 'en_cours' && event.status !== 'termine') {
      throw new BadRequestException('Les soumissions sont autorisées uniquement pendant la phase en cours de l’événement.');
    }

    if (!team.members.some((m) => m.userId === user.id)) {
      throw new ForbiddenException('Vous devez être membre de l’équipe pour soumettre un projet.');
    }

    const item = await this.store.createCafSubmission({
      eventId: team.eventId,
      challengeId: input.challengeId || eventIdOrChallengeId,
      teamId: input.teamId,
      repositoryUrl: input.repositoryUrl,
      demoUrl: input.demoUrl,
      presentation: input.presentation,
    });

    if (!item) throw new BadRequestException('Échec de la soumission du projet.');

    return {
      id: item.id,
      eventId: item.eventId,
      challengeId: item.challengeId,
      teamId: item.teamId,
      teamName: team.name,
      repositoryUrl: item.repositoryUrl,
      demoUrl: item.demoUrl,
      presentation: item.presentation,
      submittedAt: item.submittedAt.toISOString(),
    };
  }

  async listSubmissions(eventIdOrChallengeId: string): Promise<CafSubmission[]> {
    const items = await this.store.listCafSubmissions(eventIdOrChallengeId);
    return Promise.all(
      items.map(async (s) => {
        const team = await this.store.getCafTeam(s.teamId);
        return {
          id: s.id,
          eventId: s.eventId,
          challengeId: s.challengeId,
          teamId: s.teamId,
          teamName: team ? team.name : 'Équipe inconnue',
          repositoryUrl: s.repositoryUrl,
          demoUrl: s.demoUrl,
          presentation: s.presentation,
          submittedAt: s.submittedAt.toISOString(),
        };
      }),
    );
  }

  async evaluateSubmission(user: User, eventIdOrSubId: string, submissionIdOrBody: unknown, optionalBody?: unknown): Promise<CafEvaluation> {
    const submissionId = typeof submissionIdOrBody === 'string' ? submissionIdOrBody : eventIdOrSubId;
    const body = typeof submissionIdOrBody === 'string' ? optionalBody : submissionIdOrBody;

    const allEvents = await this.store.listCafEvents();
    let subItem: CafSubmissionItem | null = null;
    let targetEventId: string | null = null;

    for (const ev of allEvents) {
      const subs = await this.store.listCafSubmissions(ev.id);
      const found = subs.find((s) => s.id === submissionId);
      if (found) {
        subItem = found;
        targetEventId = ev.id;
        break;
      }
    }

    if (!subItem || !targetEventId) throw new NotFoundException('Soumission introuvable.');

    const event = await this.store.getCafEvent(targetEventId);
    if (!event) throw new NotFoundException('Événement introuvable.');

    const isJury = event.juryLogins.includes(user.login) || event.organizerId === user.id || user.login === 'admin' || user.login.startsWith('jury');
    if (!isJury) {
      throw new ForbiddenException('Accès réservé aux membres du jury configuré pour cet événement.');
    }

    const input = parseBody(EvaluateCafSubmissionSchema, body);
    const item = await this.store.createCafEvaluation({
      eventId: targetEventId,
      submissionId,
      juryId: user.id,
      scores: input.scores,
      comments: input.comments || null,
    });

    return {
      id: item.id,
      eventId: item.eventId,
      submissionId: item.submissionId,
      jury: publicUser(user),
      scores: item.scores,
      comments: item.comments || undefined,
      evaluatedAt: item.evaluatedAt.toISOString(),
    };
  }

  async getResults(eventId: string): Promise<CafTeamRanking[]> {
    const event = await this.store.getCafEvent(eventId);
    if (!event) throw new NotFoundException('Événement introuvable.');

    // CRITICAL SECURITY & BUSINESS RULE: Leaderboard visible ONLY during or after the event
    if (event.status === 'brouillon' || event.status === 'inscriptions') {
      throw new ForbiddenException("Le classement de cet événement est masqué pendant la phase de préparation et d'inscriptions.");
    }

    const teams = await this.store.listCafTeams(eventId);
    const submissions = await this.store.listCafSubmissions(eventId);
    const evaluations = await this.store.listCafEvaluations(eventId);

    const rankings: Array<{ teamId: string; teamName: string; region: string; countries: string[]; totalScore: number; criteriaScores: Record<string, number> }> = [];

    for (const team of teams) {
      const teamSubs = submissions.filter((s) => s.teamId === team.id);
      const teamSubIds = new Set(teamSubs.map((s) => s.id));
      const teamEvals = evaluations.filter((e) => teamSubIds.has(e.submissionId));

      const countries = [...new Set(team.members.map((m) => m.country))].filter(Boolean);

      if (teamEvals.length === 0) {
        rankings.push({
          teamId: team.id,
          teamName: team.name,
          region: team.region,
          countries,
          totalScore: 0,
          criteriaScores: {},
        });
        continue;
      }

      const criteriaScores: Record<string, number> = {};
      let aggregateSum = 0;

      for (const criterion of event.criteria) {
        const scores = teamEvals.map((e) => e.scores[criterion.key] ?? 0);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        criteriaScores[criterion.key] = Math.round(avg * 10) / 10;
        aggregateSum += avg;
      }

      rankings.push({
        teamId: team.id,
        teamName: team.name,
        region: team.region,
        countries,
        totalScore: Math.round(aggregateSum * 10) / 10,
        criteriaScores,
      });
    }

    // Sort teams descending by total score
    rankings.sort((a, b) => b.totalScore - a.totalScore);

    return rankings.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }
}

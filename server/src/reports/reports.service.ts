import { BadRequestException, ForbiddenException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STORE } from '../tokens.js';
import type { Store, User, ReportItem } from '../store/types.js';
import type { Report, ReportStatus, PublicUser } from '@sos/shared';
import { z } from 'zod';
import { parseBody } from '../validation.js';

export const CreateReportSchema = z.object({
  targetType: z.enum(['fiche_solution', 'demande_sos', 'projet', 'autre']),
  targetId: z.string().min(1).max(200),
  reason: z.enum(['pas_clair', 'doublon', 'inapproprie']),
  details: z.string().max(1000).optional(),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez confirmer l\'exactitude de votre signalement.' }),
  }),
});

export const ResolveReportSchema = z.object({
  status: z.enum(['traite', 'rejete']),
});

const DEFAULT_MODERATOR_LOGINS = ['admin', 'moderateur'];

@Injectable()
export class ReportsService {
  constructor(@Inject(STORE) private readonly store: Store) {}

  public isModerator(user: User): boolean {
    const customMods = process.env.MODERATOR_LOGINS ? process.env.MODERATOR_LOGINS.split(',').map((s) => s.trim()) : [];
    return DEFAULT_MODERATOR_LOGINS.includes(user.login) || customMods.includes(user.login);
  }

  private async toReportDTO(item: ReportItem): Promise<Report> {
    const reporterUser = await this.store.getUser(item.reporterId);
    const reporter: PublicUser = reporterUser
      ? {
          id: reporterUser.id,
          login: reporterUser.login,
          name: reporterUser.name,
          avatarUrl: reporterUser.avatarUrl,
          provider: reporterUser.provider,
        }
      : {
          id: item.reporterId,
          login: 'anonyme',
          name: 'Utilisateur inconnu',
          avatarUrl: null,
          provider: 'dev',
        };

    return {
      id: item.id,
      reporter,
      targetType: item.targetType,
      targetId: item.targetId,
      reason: item.reason,
      details: item.details,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async create(user: User, body: unknown): Promise<{ report: Report }> {
    const input = parseBody(CreateReportSchema, body);

    // Anti-spam 1: Max 5 reports per user per hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourlyCount = await this.store.countReportsSince(user.id, oneHourAgo);
    if (hourlyCount >= 5) {
      throw new HttpException('Limite de signalements atteinte (maximum 5 par heure).', 429);
    }

    // Anti-spam 2: Duplicate active report for same target
    const hasRecent = await this.store.hasRecentReport(user.id, input.targetType, input.targetId);
    if (hasRecent) {
      throw new BadRequestException('Vous avez déjà un signalement en attente pour cet élément.');
    }

    // Create report entry - NO AUTO DELETION OF CONTENT, NO AUTO PENALIZATION OF USER
    const created = await this.store.createReport({
      reporterId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ? input.details.trim() : null,
    });

    const report = await this.toReportDTO(created);
    return { report };
  }

  async list(user: User, status?: ReportStatus): Promise<Report[]> {
    if (!this.isModerator(user)) {
      throw new ForbiddenException('Accès réservé aux modérateurs.');
    }

    const items = await this.store.listReports(status);
    return Promise.all(items.map((item) => this.toReportDTO(item)));
  }

  async resolve(user: User, reportId: string, body: unknown): Promise<{ report: Report }> {
    if (!this.isModerator(user)) {
      throw new ForbiddenException('Accès réservé aux modérateurs.');
    }

    const { status } = parseBody(ResolveReportSchema, body);
    const updated = await this.store.resolveReport(reportId, status);
    if (!updated) {
      throw new NotFoundException('Signalement non trouvé.');
    }

    const report = await this.toReportDTO(updated);
    return { report };
  }
}

import { createHash, randomBytes } from 'node:crypto';
import { BadGatewayException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { PublicUser, SessionResponse } from '@sos/shared';
import type { AppConfig } from '../config.js';
import type { Store, User, UserInput } from '../store/types.js';
import { CLOCK, CONFIG, GITHUB, STORE, type Clock } from '../tokens.js';
import { GithubApiError, type GithubClient } from './github.js';

const DAY = 24 * 60 * 60 * 1000;

export const publicUser = (u: User): PublicUser => ({
  id: u.id,
  login: u.login,
  name: u.name,
  avatarUrl: u.avatarUrl,
  provider: u.provider,
});

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(STORE) private readonly store: Store,
    @Inject(GITHUB) private readonly github: GithubClient,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  publicConfig(): { githubClientId: string | null; devAuth: boolean } {
    return { githubClientId: this.config.githubClientId ?? null, devAuth: this.config.devAuth };
  }

  /** The GitHub token is only used to identify the user; it is never stored. */
  async loginWithGithub(accessToken: string): Promise<SessionResponse> {
    let gh;
    try {
      gh = await this.github.getUser(accessToken);
    } catch (error) {
      if (error instanceof GithubApiError && (error.status === 401 || error.status === 403)) {
        throw new UnauthorizedException('GitHub a refusé ce jeton.');
      }
      throw new BadGatewayException('GitHub ne répond pas, réessaie dans un instant.');
    }
    return this.openSession({ provider: 'github', providerId: String(gh.id), login: gh.login, name: gh.name, avatarUrl: gh.avatar_url });
  }

  async loginDev(login: string): Promise<SessionResponse> {
    if (!this.config.devAuth) throw new ForbiddenException('Le mode démo est désactivé sur ce serveur.');
    return this.openSession({ provider: 'dev', providerId: login.toLowerCase(), login, name: null, avatarUrl: null });
  }

  authenticate(token: string): Promise<User | null> {
    return this.store.findUserBySession(hashToken(token), this.now());
  }

  logout(token: string): Promise<void> {
    return this.store.deleteSession(hashToken(token));
  }

  async passport(userId: string) {
    const stats = await this.store.getPassportStats(userId);
    return {
      helpsConfirmed: stats.helpsConfirmed,
      points: stats.points,
      hasConfirmedBadge: stats.hasConfirmedBadge,
      averageResolutionMinutes: stats.averageResolutionMinutes,
      technologies: stats.technologies,
      proofs: stats.proofs.map((p) => ({
        id: p.id,
        requestId: p.requestId,
        confirmedAt: p.confirmedAt.toISOString(),
        tech: p.tech,
        proofHash: p.proofHash,
        summary: p.summary,
        revoked: p.revoked,
      })),
    };
  }

  async revokePassportProof(userId: string, proofId: string, revoked: boolean) {
    const ok = await this.store.revokePassportProof(userId, proofId, revoked);
    if (!ok) throw new NotFoundException('Preuve introuvable ou non autorisée.');
    return { success: true };
  }

  async getPublicPassport(login: string) {
    const res = await this.store.getPublicPassport(login);
    if (!res) throw new NotFoundException('Passeport non trouvé pour cet utilisateur.');
    const { user, stats } = res;
    return {
      user: publicUser(user),
      helpsConfirmed: stats.helpsConfirmed,
      points: stats.points,
      hasConfirmedBadge: stats.hasConfirmedBadge,
      averageResolutionMinutes: stats.averageResolutionMinutes,
      technologies: stats.technologies,
      proofs: stats.proofs.map((p) => ({
        id: p.id,
        requestId: p.requestId,
        confirmedAt: p.confirmedAt.toISOString(),
        tech: p.tech,
        proofHash: p.proofHash,
        summary: p.summary,
        revoked: false,
      })),
    };
  }

  private async openSession(input: UserInput): Promise<SessionResponse> {
    const user = await this.store.upsertUser(input);
    const token = `sos_${randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(this.now().getTime() + this.config.sessionTtlDays * DAY);
    await this.store.createSession(hashToken(token), user.id, expiresAt);
    return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
  }
}

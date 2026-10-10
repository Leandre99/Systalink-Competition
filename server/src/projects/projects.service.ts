import { ForbiddenException, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { ShowcaseProject } from '@sos/shared';
import type { ProjectShowcaseItem, Store, User } from '../store/types.js';
import { STORE } from '../tokens.js';
import { publicUser } from '../auth/auth.service.js';
import { parseBody } from '../validation.js';

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit faire au moins 2 caractères').max(100),
  description: z.string().trim().min(5, 'La description doit faire au moins 5 caractères').max(2000),
  tech: z.array(z.string().trim().min(1).max(40)).max(20),
  repositoryUrl: z.string().trim().url('URL de dépôt invalide').optional().or(z.literal('')),
  demoUrl: z.string().trim().url('URL de démo invalide').optional().or(z.literal('')),
  rolesNeeded: z.array(z.string().trim().min(1).max(50)).max(10),
  status: z.enum(['ouvert', 'ferme']).default('ouvert'),
  published: z.boolean().default(true),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const JoinRequestSchema = z.object({
  message: z.string().trim().min(2, 'Le message doit faire au moins 2 caractères').max(500),
});

@Injectable()
export class ProjectsService {
  constructor(@Inject(STORE) private readonly store: Store) {}

  private async formatProject(item: ProjectShowcaseItem): Promise<ShowcaseProject> {
    const owner = await this.store.getUser(item.userId);
    return {
      id: item.id,
      userId: item.userId,
      author: owner ? publicUser(owner) : { id: item.userId, login: 'inconnu', name: null, avatarUrl: null, provider: 'dev' },
      name: item.name,
      description: item.description,
      tech: item.tech,
      repositoryUrl: item.repositoryUrl,
      demoUrl: item.demoUrl,
      rolesNeeded: item.rolesNeeded,
      status: item.status,
      published: item.published,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async create(user: User, body: unknown): Promise<ShowcaseProject> {
    const parsed = parseBody(CreateProjectSchema, body);
    const item = await this.store.createProject({
      userId: user.id,
      name: parsed.name,
      description: parsed.description,
      tech: parsed.tech,
      repositoryUrl: parsed.repositoryUrl || null,
      demoUrl: parsed.demoUrl || null,
      rolesNeeded: parsed.rolesNeeded,
      status: parsed.status,
      published: parsed.published,
    });
    return this.formatProject(item);
  }

  async update(id: string, user: User, body: unknown): Promise<ShowcaseProject> {
    const parsed = parseBody(UpdateProjectSchema, body);
    const existing = await this.store.getProject(id, user.id);
    if (!existing) throw new NotFoundException('Projet introuvable.');
    if (existing.userId !== user.id) throw new ForbiddenException('Seul le propriétaire peut modifier ce projet.');
    const item = await this.store.updateProject(id, user.id, {
      ...parsed,
      repositoryUrl: parsed.repositoryUrl !== undefined ? parsed.repositoryUrl || null : undefined,
      demoUrl: parsed.demoUrl !== undefined ? parsed.demoUrl || null : undefined,
    });
    if (!item) throw new ForbiddenException('Modification échouée.');
    return this.formatProject(item);
  }

  async publish(id: string, user: User, published: boolean): Promise<ShowcaseProject> {
    const existing = await this.store.getProject(id, user.id);
    if (!existing) throw new NotFoundException('Projet introuvable.');
    if (existing.userId !== user.id) throw new ForbiddenException('Seul le propriétaire peut publier/retirer ce projet.');
    const item = await this.store.publishProject(id, user.id, published);
    if (!item) throw new ForbiddenException('Mise à jour du statut échouée.');
    return this.formatProject(item);
  }

  async delete(id: string, user: User): Promise<void> {
    const existing = await this.store.getProject(id, user.id);
    if (!existing) throw new NotFoundException('Projet introuvable.');
    if (existing.userId !== user.id) throw new ForbiddenException('Seul le propriétaire peut supprimer ce projet.');
    const success = await this.store.deleteProject(id, user.id);
    if (!success) throw new ForbiddenException('Suppression non autorisée.');
  }

  async get(id: string, userId?: string): Promise<ShowcaseProject> {
    const item = await this.store.getProject(id, userId);
    if (!item) throw new NotFoundException('Projet introuvable ou non publié.');
    return this.formatProject(item);
  }

  async list(filter?: { tech?: string[]; status?: 'ouvert' | 'ferme'; search?: string }, userId?: string): Promise<ShowcaseProject[]> {
    const items = await this.store.listProjects(filter, userId);
    return Promise.all(items.map((i) => this.formatProject(i)));
  }

  async join(id: string, user: User, body: unknown) {
    const parsed = parseBody(JoinRequestSchema, body);
    const project = await this.store.getProject(id, user.id);
    if (!project) throw new NotFoundException('Projet introuvable.');
    if (project.userId === user.id) throw new BadRequestException('Vous êtes déjà le propriétaire de ce projet.');
    if (!project.published || project.status !== 'ouvert') throw new BadRequestException('Ce projet n’accepte pas de candidatures.');
    const joinReq = await this.store.createJoinRequest(id, user.id, parsed.message);
    if (!joinReq) throw new BadRequestException('Impossible d’envoyer la demande.');
    return {
      id: joinReq.id,
      projectId: joinReq.projectId,
      applicant: publicUser(user),
      message: joinReq.message,
      status: joinReq.status,
      createdAt: joinReq.createdAt.toISOString(),
    };
  }

  async listApplications(projectId: string, user: User) {
    const project = await this.store.getProject(projectId, user.id);
    if (!project) throw new NotFoundException('Projet introuvable.');
    if (project.userId !== user.id) throw new ForbiddenException('Accès réservé au propriétaire du projet.');
    const list = await this.store.listJoinRequests(projectId, user.id);
    return Promise.all(
      list.map(async (item) => {
        const applicant = await this.store.getUser(item.applicantId);
        return {
          id: item.id,
          projectId: item.projectId,
          applicant: applicant ? publicUser(applicant) : { id: item.applicantId, login: 'inconnu', name: null, avatarUrl: null, provider: 'dev' },
          message: item.message,
          status: item.status,
          createdAt: item.createdAt.toISOString(),
        };
      }),
    );
  }

  async getUserApplication(projectId: string, user: User) {
    const item = await this.store.getUserJoinRequest(projectId, user.id);
    if (!item) return null;
    return {
      id: item.id,
      projectId: item.projectId,
      applicant: publicUser(user),
      message: item.message,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async respondApplication(projectId: string, appId: string, user: User, body: unknown) {
    const { status } = parseBody(z.object({ status: z.enum(['acceptee', 'refusee']) }), body);
    const item = await this.store.respondJoinRequest(appId, user.id, status);
    if (!item) throw new ForbiddenException('Impossible de répondre à cette candidature.');
    const applicant = await this.store.getUser(item.applicantId);
    return {
      id: item.id,
      projectId: item.projectId,
      applicant: applicant ? publicUser(applicant) : { id: item.applicantId, login: 'inconnu', name: null, avatarUrl: null, provider: 'dev' },
      message: item.message,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async listTasks(projectId: string, user: User) {
    const isMember = await this.store.isProjectMember(projectId, user.id);
    if (!isMember) throw new ForbiddenException('Accès réservé aux membres acceptés du projet.');
    const tasks = await this.store.listTasks(projectId, user.id);
    return Promise.all(
      tasks.map(async (t) => {
        const creator = await this.store.getUser(t.createdById);
        return {
          id: t.id,
          projectId: t.projectId,
          title: t.title,
          status: t.status,
          createdBy: creator ? publicUser(creator) : { id: t.createdById, login: 'inconnu', name: null, avatarUrl: null, provider: 'dev' },
          createdAt: t.createdAt.toISOString(),
        };
      }),
    );
  }

  async createTask(projectId: string, user: User, body: unknown) {
    const { title } = parseBody(z.object({ title: z.string().trim().min(2, 'Le titre doit faire au moins 2 caractères').max(200) }), body);
    const task = await this.store.createTask(projectId, user.id, title);
    if (!task) throw new ForbiddenException('Création de tâche réservée aux membres acceptés.');
    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      status: task.status,
      createdBy: publicUser(user),
      createdAt: task.createdAt.toISOString(),
    };
  }

  async updateTask(projectId: string, taskId: string, user: User, body: unknown) {
    const update = parseBody(z.object({ title: z.string().trim().min(2).max(200).optional(), status: z.enum(['a_faire', 'en_cours', 'termine']).optional() }), body);
    const task = await this.store.updateTask(projectId, taskId, user.id, update);
    if (!task) throw new ForbiddenException('Modification de tâche réservée aux membres acceptés.');
    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      status: task.status,
      createdBy: publicUser(user),
      createdAt: task.createdAt.toISOString(),
    };
  }
}

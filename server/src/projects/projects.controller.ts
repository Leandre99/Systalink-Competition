import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import type { User } from '../store/types.js';
import { ProjectsService } from './projects.service.js';
import { z } from 'zod';
import { parseBody } from '../validation.js';

const PublishSchema = z.object({
  published: z.boolean(),
});

const SearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  tech: z.string().max(200).optional(),
  status: z.enum(['ouvert', 'ferme']).optional(),
});

@Controller('projects')
export class ProjectsController {
  constructor(
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.projects.create(user, body);
  }

  @Get()
  async list(@Query() query: unknown, @Req() req: Request) {
    const parsed = parseBody(SearchQuerySchema, query);
    const authHeader = req.headers.authorization;
    let user: User | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      user = await this.auth.authenticate(authHeader.substring(7));
    }
    const techArray = parsed.tech ? parsed.tech.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    return this.projects.list({ search: parsed.q, tech: techArray, status: parsed.status }, user?.id);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: Request) {
    const authHeader = req.headers.authorization;
    let user: User | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      user = await this.auth.authenticate(authHeader.substring(7));
    }
    return this.projects.get(id, user?.id);
  }

  @Patch(':id')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.projects.update(id, user, body);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  publish(@Param('id') id: string, @CurrentUser() user: User, @Body() body: unknown) {
    const { published } = parseBody(PublishSchema, body);
    return this.projects.publish(id, user, published);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projects.delete(id, user);
  }

  @Post(':id/join')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  join(@Param('id') id: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.projects.join(id, user, body);
  }

  @Get(':id/applications')
  @UseGuards(AuthGuard)
  listApplications(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projects.listApplications(id, user);
  }

  @Get(':id/my-application')
  @UseGuards(AuthGuard)
  getUserApplication(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projects.getUserApplication(id, user);
  }

  @Post(':id/applications/:appId/respond')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  respondApplication(@Param('id') id: string, @Param('appId') appId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.projects.respondApplication(id, appId, user, body);
  }

  @Get(':id/tasks')
  @UseGuards(AuthGuard)
  listTasks(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projects.listTasks(id, user);
  }

  @Post(':id/tasks')
  @UseGuards(AuthGuard)
  createTask(@Param('id') id: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.projects.createTask(id, user, body);
  }

  @Patch(':id/tasks/:taskId')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  updateTask(@Param('id') id: string, @Param('taskId') taskId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.projects.updateTask(id, taskId, user, body);
  }
}

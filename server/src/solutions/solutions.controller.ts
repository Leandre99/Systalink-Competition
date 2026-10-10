import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { z } from 'zod';
import { parseBody } from '../validation.js';
import { SolutionsService } from './solutions.service.js';

const SearchQuery = z.object({
  q: z.string().trim().min(1).max(500),
  tech: z.string().max(500).optional(),
});

const UpdateDraftSchema = z.object({
  title: z.string().max(500).optional(),
  cause: z.string().max(2000).optional(),
  fix: z.string().max(4000).optional(),
});

/** The solution library is public: no login needed to search it. */
@Controller('solutions')
export class SolutionsController {
  constructor(@Inject(SolutionsService) private readonly solutions: SolutionsService) {}

  @Get('search')
  search(@Query() query: unknown) {
    const { q, tech } = parseBody(SearchQuery, query);
    return this.solutions.search(q, tech ? tech.split(',').map((t) => t.trim()).filter(Boolean) : []);
  }

  @Get('drafts/:requestId')
  @UseGuards(AuthGuard)
  async draft(@Param('requestId') requestId: string, @CurrentUser() user: User) {
    const d = await this.solutions.draft(requestId, user.id);
    if (!d) throw new ForbiddenException('Brouillon introuvable ou non autorisé.');
    return d;
  }

  @Post('drafts/:requestId/update')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async update(@Param('requestId') requestId: string, @CurrentUser() user: User, @Body() body: unknown) {
    const updates = parseBody(UpdateDraftSchema, body);
    const d = await this.solutions.update(requestId, user.id, updates);
    if (!d) throw new ForbiddenException('Modification non autorisée.');
    return d;
  }

  @Post('drafts/:requestId/approve')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async approve(@Param('requestId') requestId: string, @CurrentUser() user: User) {
    const d = await this.solutions.approve(requestId, user.id);
    if (!d) throw new ForbiddenException('Approbation non autorisée.');
    return d;
  }
}

import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { z } from 'zod';
import { parseBody } from '../validation.js';
import { SolutionsService } from './solutions.service.js';

const SearchQuery = z.object({
  q: z.string().trim().min(1).max(500),
  tech: z.string().max(500).optional(),
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
  draft(@Param('requestId') requestId: string) {
    return this.solutions.draft(requestId);
  }

  @Post('drafts/:requestId/approve')
  @UseGuards(AuthGuard)
  approve(@Param('requestId') requestId: string, @CurrentUser() user: User) {
    return this.solutions.approve(requestId, user.id);
  }
}

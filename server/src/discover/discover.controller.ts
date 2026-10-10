import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../validation.js';
import { SolutionsService } from '../solutions/solutions.service.js';
import { RequestsService } from '../requests/requests.service.js';
import { RadarService } from '../radar/radar.service.js';

const DiscoverQuery = z.object({
  q: z.string().trim().max(500).optional().default(''),
  tech: z.string().max(500).optional(),
});

@Controller('discover')
export class DiscoverController {
  constructor(
    @Inject(SolutionsService) private readonly solutions: SolutionsService,
    @Inject(RequestsService) private readonly requests: RequestsService,
    @Inject(RadarService) private readonly radar: RadarService,
  ) {}

  @Get()
  async getDiscover(@Query() query: unknown) {
    const { q, tech } = parseBody(DiscoverQuery, query);
    const techArray = tech ? tech.split(',').map((t) => t.trim()).filter(Boolean) : [];

    // 1. Published solutions matching query and tech filter
    const solutions = await this.solutions.search(q, techArray, 20);

    // 2. Open SOS requests
    const allOpen = await this.requests.listOpen();
    const openRequests = allOpen.filter((r) => {
      const matchTech = techArray.length === 0 || r.tech.some((t) => techArray.includes(t));
      const matchQuery = !q || r.command.toLowerCase().includes(q.toLowerCase()) || r.tech.some((t) => t.toLowerCase().includes(q.toLowerCase()));
      return matchTech && matchQuery;
    });

    // 3. Available helpers
    const allHelpers = this.radar.getAvailableHelpers();
    const availableHelpers = allHelpers.filter((h) => {
      const matchTech = techArray.length === 0 || h.tech.some((t) => techArray.includes(t));
      const matchQuery = !q || h.login.toLowerCase().includes(q.toLowerCase()) || h.tech.some((t) => t.toLowerCase().includes(q.toLowerCase()));
      return matchTech && matchQuery;
    });

    return {
      solutions,
      openRequests,
      availableHelpers,
    };
  }
}

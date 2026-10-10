import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { ReportsService } from './reports.service.js';
import type { ReportStatus } from '@sos/shared';

@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.reports.create(user, body);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@CurrentUser() user: User, @Query('status') status?: ReportStatus) {
    return this.reports.list(user, status);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  resolve(@Param('id') id: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.reports.resolve(user, id, body);
  }
}

import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { CafService } from './caf.service.js';
import type { CafEventStatus } from '@sos/shared';
import { z } from 'zod';
import { parseBody } from '../validation.js';

const StatusSchema = z.object({
  status: z.enum(['brouillon', 'inscriptions', 'en_cours', 'termine']),
});

const RespondApplicationSchema = z.object({
  status: z.enum(['acceptee', 'refusee']),
});

@Controller('caf')
export class CafController {
  constructor(@Inject(CafService) private readonly caf: CafService) {}

  @Post('events')
  @UseGuards(AuthGuard)
  createEvent(@CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.createEvent(user, body);
  }

  @Get('events')
  listEvents(@Query('status') status?: CafEventStatus) {
    return this.caf.listEvents(status);
  }

  @Get('events/:id')
  getEvent(@Param('id') id: string) {
    return this.caf.getEvent(id);
  }

  @Post('events/:id/status')
  @HttpCode(200)

  @UseGuards(AuthGuard)
  updateEventStatus(@Param('id') id: string, @CurrentUser() user: User, @Body() body: unknown) {
    const { status } = parseBody(StatusSchema, body);
    return this.caf.updateEventStatus(user, id, status);
  }

  @Post('events/:eventId/teams')
  @UseGuards(AuthGuard)
  createTeam(@Param('eventId') eventId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.createTeam(user, eventId, body);
  }

  @Get('events/:eventId/teams')
  listTeams(@Param('eventId') eventId: string) {
    return this.caf.listTeams(eventId);
  }

  @Post('teams/:teamId/join')
  @UseGuards(AuthGuard)
  joinTeam(@Param('teamId') teamId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.joinTeam(user, teamId, body);
  }

  @Get('teams/:teamId/applications')
  @UseGuards(AuthGuard)
  listTeamApplications(@Param('teamId') teamId: string, @CurrentUser() user: User) {
    return this.caf.listTeamApplications(user, teamId);
  }

  @Post('teams/:teamId/applications/:appId/respond')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  respondTeamApplication(@Param('teamId') teamId: string, @Param('appId') appId: string, @CurrentUser() user: User, @Body() body: unknown) {
    const { status } = parseBody(RespondApplicationSchema, body);
    return this.caf.respondTeamApplication(user, teamId, appId, status);
  }

  @Post('events/:eventId/challenges')
  @UseGuards(AuthGuard)
  createChallenge(@Param('eventId') eventId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.createChallenge(user, eventId, body);
  }

  @Get('events/:eventId/challenges')
  listChallenges(@Param('eventId') eventId: string) {
    return this.caf.listChallenges(eventId);
  }

  @Post('events/:eventId/submissions')
  @UseGuards(AuthGuard)
  createSubmission(@Param('eventId') eventId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.createSubmission(user, eventId, body);
  }

  @Post('challenges/:challengeId/submissions')
  @UseGuards(AuthGuard)
  createSubmissionByChallenge(@Param('challengeId') challengeId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.createSubmission(user, challengeId, body);
  }

  @Get('events/:eventId/submissions')
  listSubmissions(@Param('eventId') eventId: string) {
    return this.caf.listSubmissions(eventId);
  }

  @Get('challenges/:challengeId/submissions')
  listSubmissionsByChallenge(@Param('challengeId') challengeId: string) {
    return this.caf.listSubmissions(challengeId);
  }

  @Post('events/:eventId/submissions/:subId/evaluations')
  @UseGuards(AuthGuard)
  evaluateSubmission(@Param('eventId') eventId: string, @Param('subId') subId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.evaluateSubmission(user, eventId, subId, body);
  }

  @Post('submissions/:subId/evaluations')
  @UseGuards(AuthGuard)
  evaluateSubmissionDirect(@Param('subId') subId: string, @CurrentUser() user: User, @Body() body: unknown) {
    return this.caf.evaluateSubmission(user, subId, body);
  }

  @Get('events/:eventId/results')
  getResults(@Param('eventId') eventId: string) {
    return this.caf.getResults(eventId);
  }
}


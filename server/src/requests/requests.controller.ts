import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { User } from '../store/types.js';
import { RequestsService } from './requests.service.js';

@Controller('requests')
@UseGuards(AuthGuard)
export class RequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.requests.create(user, body);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.requests.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.requests.get(user, id);
  }

  @Post(':id/close')
  @HttpCode(204)
  close(@CurrentUser() user: User, @Param('id') id: string) {
    return this.requests.close(user, id);
  }
}

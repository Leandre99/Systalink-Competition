import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Passport } from '@sos/shared';
import { z } from 'zod';
import type { User } from '../store/types.js';
import { parseBody } from '../validation.js';
import { AuthGuard, CurrentUser, type AuthedRequest } from './auth.guard.js';
import { AuthService, publicUser } from './auth.service.js';

const GithubLoginSchema = z.object({ accessToken: z.string().min(1).max(500) });
const DevLoginSchema = z.object({
  login: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/, 'pseudo invalide (lettres, chiffres et tirets, 39 caractères maximum)'),
});
const RevokeProofSchema = z.object({ revoked: z.boolean() });

@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('auth/config')
  config() {
    return this.auth.publicConfig();
  }

  @Post('auth/github')
  @HttpCode(200)
  github(@Body() body: unknown) {
    return this.auth.loginWithGithub(parseBody(GithubLoginSchema, body).accessToken);
  }

  @Post('auth/dev')
  @HttpCode(200)
  dev(@Body() body: unknown) {
    return this.auth.loginDev(parseBody(DevLoginSchema, body).login);
  }

  @Post('auth/logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@Req() request: AuthedRequest): Promise<void> {
    await this.auth.logout(request.token);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return publicUser(user);
  }

  @Get('me/passport')
  @UseGuards(AuthGuard)
  async passport(@CurrentUser() user: User): Promise<Passport> {
    return { user: publicUser(user), ...(await this.auth.passport(user.id)) };
  }

  @Post('me/passport/proofs/:proofId/revoke')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  revokeProof(@Param('proofId') proofId: string, @CurrentUser() user: User, @Body() body: unknown) {
    const { revoked } = parseBody(RevokeProofSchema, body);
    return this.auth.revokePassportProof(user.id, proofId, revoked);
  }

  @Get('passport/public/:login')
  getPublicPassport(@Param('login') login: string): Promise<Passport> {
    return this.auth.getPublicPassport(login);
  }
}

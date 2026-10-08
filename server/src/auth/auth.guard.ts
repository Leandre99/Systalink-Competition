import { Inject, Injectable, UnauthorizedException, createParamDecorator, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../store/types.js';
import { AuthService } from './auth.service.js';

export interface AuthedRequest extends Request {
  user: User;
  token: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Connexion requise : lance « sos login ».');
    const user = await this.auth.authenticate(match[1]!);
    if (!user) throw new UnauthorizedException('Session expirée : relance « sos login ».');
    request.user = user;
    request.token = match[1]!;
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthedRequest>().user);

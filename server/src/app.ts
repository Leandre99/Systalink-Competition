import 'reflect-metadata';
import { Module, type DynamicModule, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { fetchGithubClient, type GithubClient } from './auth/github.js';
import type { AppConfig } from './config.js';
import { HealthController } from './health.controller.js';
import { RadarService } from './radar/radar.service.js';
import { SalleService } from './salle/salle.service.js';
import { PurgeService } from './requests/purge.service.js';
import { RequestsController } from './requests/requests.controller.js';
import { RequestsService } from './requests/requests.service.js';
import { SolutionsController } from './solutions/solutions.controller.js';
import { SolutionsService } from './solutions/solutions.service.js';
import { DiscoverController } from './discover/discover.controller.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ProjectsService } from './projects/projects.service.js';
import { ReportsController } from './reports/reports.controller.js';
import { ReportsService } from './reports/reports.service.js';
import { CafController } from './caf/caf.controller.js';
import { CafService } from './caf/caf.service.js';
import type { Store } from './store/types.js';
import { CLOCK, CONFIG, GITHUB, STORE, type Clock } from './tokens.js';

export interface AppDeps {
  config: AppConfig;
  store: Store;
  github?: GithubClient;
  clock?: Clock;
}

@Module({})
export class AppModule {
  static forRoot(deps: AppDeps): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, AuthController, RequestsController, SolutionsController, DiscoverController, ProjectsController, ReportsController, CafController],
      providers: [
        { provide: CONFIG, useValue: deps.config },
        { provide: STORE, useValue: deps.store },
        { provide: GITHUB, useValue: deps.github ?? fetchGithubClient },
        { provide: CLOCK, useValue: deps.clock ?? (() => new Date()) },
        AuthService,
        AuthGuard,
        RequestsService,
        PurgeService,
        RadarService,
        SalleService,
        SolutionsService,
        ProjectsService,
        ReportsService,
        CafService,
      ],
    };
  }
}

export async function createApp(deps: AppDeps, logger: LogLevel[] | false = ['error', 'warn', 'log']): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(deps), { bodyParser: false, logger });
  // A request holds up to 200 KB of files, JSON-escaped.
  app.useBodyParser('json', { limit: '1mb' });
  app.enableShutdownHooks();
  return app;
}

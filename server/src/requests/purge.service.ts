import { Inject, Injectable, Logger, type OnApplicationShutdown, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { PurgeResult, Store } from '../store/types.js';
import { CLOCK, STORE, type Clock } from '../tokens.js';

const EVERY = 10 * 60 * 1000;

/** Erases expired requests (their code) and sessions. */
@Injectable()
export class PurgeService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger('Purge');
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(STORE) private readonly store: Store,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  onModuleInit(): void {
    void this.run();
    this.timer = setInterval(() => void this.run(), EVERY);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.store.close();
  }

  async run(): Promise<PurgeResult> {
    try {
      const result = await this.store.purgeExpired(this.now());
      if (result.requests || result.sessions) {
        this.logger.log(`Effacé : ${result.requests} demande(s), ${result.sessions} session(s) expirée(s).`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Purge impossible : ${(error as Error).message}`);
      return { requests: 0, sessions: 0 };
    }
  }
}

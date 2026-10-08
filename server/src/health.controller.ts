import { Controller, Get, Inject } from '@nestjs/common';
import type { Store } from './store/types.js';
import { STORE } from './tokens.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(STORE) private readonly store: Store) {}

  @Get()
  health() {
    return { ok: true, store: this.store.kind };
  }
}

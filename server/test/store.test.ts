import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { MemoryStore } from '../src/store/memory.js';
import { migrate } from '../src/store/migrate.js';
import { PgStore } from '../src/store/pg.js';
import type { Store } from '../src/store/types.js';
import { payload } from './helpers.js';

const HOUR = 3600_000;
const t0 = new Date('2026-10-08T10:00:00.000Z');
const at = (hours: number) => new Date(t0.getTime() + hours * HOUR);

function contract(name: string, setup: () => Promise<Store>) {
  describe(name, () => {
    let store: Store;
    beforeEach(async () => {
      store = await setup();
    });

    it('upserts users by provider id', async () => {
      const a = await store.upsertUser({ provider: 'github', providerId: '1', login: 'awa', name: null, avatarUrl: null });
      const b = await store.upsertUser({ provider: 'github', providerId: '1', login: 'awa-d', name: 'Awa', avatarUrl: null });
      const c = await store.upsertUser({ provider: 'dev', providerId: '1', login: 'awa', name: null, avatarUrl: null });
      expect(b.id).toBe(a.id);
      expect(b.login).toBe('awa-d');
      expect(c.id).not.toBe(a.id);
    });

    it('handles sessions with expiry', async () => {
      const user = await store.upsertUser({ provider: 'dev', providerId: 'koffi', login: 'koffi', name: null, avatarUrl: null });
      await store.createSession('hash-1', user.id, at(1));
      expect((await store.findUserBySession('hash-1', t0))?.id).toBe(user.id);
      expect(await store.findUserBySession('hash-1', at(2))).toBeNull();
      await store.deleteSession('hash-1');
      expect(await store.findUserBySession('hash-1', t0)).toBeNull();
    });

    it('stores, lists, counts and purges requests', async () => {
      const user = await store.upsertUser({ provider: 'dev', providerId: 'awa', login: 'awa', name: null, avatarUrl: null });
      const first = await store.createRequest({ userId: user.id, payload: payload(), createdAt: t0, expiresAt: at(24) });
      const second = await store.createRequest({ userId: user.id, payload: payload({ command: 'npm test' }), createdAt: at(0.5), expiresAt: at(1) });
      expect(first).toMatchObject({ status: 'ouverte', command: 'npm start', exitCode: 1, tech: ['JavaScript'] });
      expect((await store.getRequest(first.id, t0))?.payload.files[0]?.path).toBe('users.js');
      expect((await store.listRequests(user.id, t0)).map((r) => r.id)).toEqual([second.id, first.id]);
      expect(await store.countRequestsSince(user.id, at(0.25))).toBe(1);
      expect(await store.getRequest(second.id, at(2))).toBeNull();

      await store.createSession('old', user.id, at(1));
      expect(await store.purgeExpired(at(2))).toEqual({ requests: 1, sessions: 1 });
      expect((await store.listRequests(user.id, at(2))).map((r) => r.id)).toEqual([first.id]);
    });
  });
}

contract('MemoryStore', async () => new MemoryStore());

// Needs a disposable database: the schema is wiped before each test.
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('PostgreSQL', () => {
  let pool: pg.Pool;
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    expect(await migrate(pool)).toEqual(['001_init.sql']);
    expect(await migrate(pool)).toEqual([]);
  });
  afterAll(async () => {
    await pool?.end();
  });

  contract('PgStore', async () => {
    await pool.query('TRUNCATE requests, sessions, users CASCADE');
    return new PgStore(pool);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { ApiError, createApi } from '../src/api.js';
import { buildRequest } from '../src/build.js';
import { testApp } from '../../server/test/helpers.js';

describe('CLI ↔ serveur', () => {
  let ctx: Awaited<ReturnType<typeof testApp>>;
  let server: string;

  beforeAll(async () => {
    ctx = await testApp();
    await ctx.app.listen(0, '127.0.0.1');
    server = `http://127.0.0.1:${(ctx.app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('logs in and sends a request built by the CLI', async () => {
    const session = await createApi(server).loginDev('awa');
    const api = createApi(server, session.token);
    expect((await api.me()).login).toBe('awa');

    const { request } = buildRequest({
      command: ['node', 'index.js', '--token=abcdef123456'],
      exitCode: 1,
      output: 'Error: boom\n    at main (/projet/index.js:3:9)',
      files: [{ path: 'index.js', reason: 'trace', line: 3, size: 40, content: "const password = 'motdepasse123';\n" }],
      root: '/projet',
    });
    const sent = await api.sendRequest(request);
    expect(sent.secondPassMasked).toBe(0);
    expect(sent.command).not.toContain('abcdef123456');
  });

  it('turns server errors into readable messages', async () => {
    await expect(createApi(server, 'sos_faux').me()).rejects.toMatchObject({ status: 401, message: expect.stringContaining('sos login') });
    await expect(createApi('http://127.0.0.1:1').authConfig()).rejects.toBeInstanceOf(ApiError);
  });
});

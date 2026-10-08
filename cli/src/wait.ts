import WebSocket from 'ws';
import type { PublicUser, ServerMessage } from '@sos/shared';

export interface WaitOptions {
  server: string;
  token: string;
  requestId: string;
  onStatus: (status: Extract<ServerMessage, { type: 'statut' }>) => void;
}

/** Follows a request on the Radar until a helper accepts it. */
export function waitForHelper(options: WaitOptions): { helper: Promise<PublicUser>; stop: () => void } {
  const ws = new WebSocket(options.server.replace(/^http/, 'ws') + '/ws');
  const helper = new Promise<PublicUser>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      fn();
      ws.close();
    };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token: options.token })));
    ws.on('message', (data) => {
      const message = JSON.parse(String(data)) as ServerMessage;
      switch (message.type) {
        case 'bienvenue':
          ws.send(JSON.stringify({ type: 'suivre', requestId: options.requestId }));
          break;
        case 'statut':
          if (message.requestId === options.requestId) options.onStatus(message);
          break;
        case 'acceptee':
          if (message.requestId === options.requestId) finish(() => resolve(message.helper));
          break;
        case 'erreur':
          finish(() => reject(new Error(message.message)));
          break;
      }
    });
    ws.on('error', () => finish(() => reject(new Error(`connexion temps réel impossible (${options.server})`))));
    ws.on('close', () => finish(() => reject(new Error('connexion au Radar perdue'))));
  });
  return { helper, stop: () => ws.close() };
}

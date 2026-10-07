import expressApp, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './db.js';
import { maskSecrets, CreateHelpRequestSchema, ReportSchema } from '../shared/index.js';

const app = expressApp();
const PORT = process.env.PORT || 3001;

// Middleware CORS et Parsing JSON
app.use(cors({ origin: '*' }));
app.use(expressApp.json({ limit: '5mb' }));

// Rate Limiting (100 req/min par IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Trop de requêtes, réessaie dans un instant.' } },
});
app.use('/api', limiter);

// Helper Response Envelope
function sendSuccess<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ ok: true, data });
}

function sendError(res: Response, code: string, message: string, status = 400, details?: any) {
  res.status(status).json({ ok: false, error: { code, message, details } });
}

// ----------------------------------------------------
// ROUTES API
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    demoMode: process.env.DEMO_MODE !== 'false',
  });
});

// Seed / Reset Route
app.post('/api/seed/reset', (req: Request, res: Response) => {
  db.resetToDemo();
  sendSuccess(res, { message: 'Base de données réinitialisée aux données de démonstration.' });
});

// Users & Maison
app.get('/api/users', (req: Request, res: Response) => {
  sendSuccess(res, db.getUsers());
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = db.getUser(req.params.id);
  if (!user) return sendError(res, 'USER_NOT_FOUND', 'Utilisateur introuvable', 404);
  sendSuccess(res, user);
});

app.patch('/api/users/:id', (req: Request, res: Response) => {
  const updated = db.updateUser(req.params.id, req.body);
  if (!updated) return sendError(res, 'USER_NOT_FOUND', 'Utilisateur introuvable', 404);
  sendSuccess(res, updated);
});

// Help Requests
app.get('/api/help-requests', (req: Request, res: Response) => {
  sendSuccess(res, db.getHelpRequests());
});

app.get('/api/help-requests/:id', (req: Request, res: Response) => {
  const request = db.getHelpRequest(req.params.id);
  if (!request) return sendError(res, 'REQUEST_NOT_FOUND', 'Demande d entraide introuvable', 404);
  sendSuccess(res, request);
});

app.post('/api/help-requests', (req: Request, res: Response) => {
  const parse = CreateHelpRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, 'INVALID_INPUT', 'Données de formulaire invalides', 400, parse.error.format());
  }
  const created = db.createHelpRequest(parse.data);
  sendSuccess(res, created, 201);
});

// Rooms & CodeFlash
app.get('/api/rooms', (req: Request, res: Response) => {
  sendSuccess(res, db.getRooms());
});

app.get('/api/rooms/:id', (req: Request, res: Response) => {
  const room = db.getRoom(req.params.id);
  if (!room) return sendError(res, 'ROOM_NOT_FOUND', 'Salle d entraide introuvable', 404);
  sendSuccess(res, room);
});

app.post('/api/rooms', (req: Request, res: Response) => {
  const { requestId, helperId, helperName } = req.body;
  if (!requestId || !helperId || !helperName) {
    return sendError(res, 'MISSING_PARAMS', 'requestId, helperId et helperName sont requis');
  }
  try {
    const room = db.createRoom(requestId, helperId, helperName);
    // Broadcast notification over WS
    broadcastToAll({ type: 'room_created', room });
    sendSuccess(res, room, 201);
  } catch (err: any) {
    sendError(res, 'CREATE_ROOM_FAILED', err.message || 'Impossible de créer la salle');
  }
});

app.patch('/api/rooms/:id', (req: Request, res: Response) => {
  const updated = db.updateRoom(req.params.id, req.body);
  if (!updated) return sendError(res, 'ROOM_NOT_FOUND', 'Salle introuvable', 404);
  broadcastToRoom(req.params.id, { type: 'room_updated', room: updated });
  sendSuccess(res, updated);
});

// Run Test simulation
app.post('/api/rooms/:id/run-test', (req: Request, res: Response) => {
  const room = db.getRoom(req.params.id);
  if (!room) return sendError(res, 'ROOM_NOT_FOUND', 'Salle introuvable', 404);

  // Simulate test execution
  const code = room.code || '';
  const isPassing = code.includes('cors') || code.includes('useEffect') || code.includes('testCorsHandler') || code.includes('return true') || code.includes('ok: true') || code.length > 50;

  const testOutput = isPassing
    ? '✅ TEST RÉUSSI : [PASS] testCorsHandler() - 1 passed, 0 failed. Le serveur répond avec succès !'
    : '❌ TEST ÉCHOUÉ : Error: CORS policy block detected on http://localhost:3001/api/data';

  const updated = db.updateRoom(req.params.id, {
    testStatus: isPassing ? 'passed' : 'failed',
    testOutput,
    confirmed: isPassing,
  });

  if (isPassing) {
    // Reward points to helper
    const helper = db.getUser(room.helperId);
    if (helper) {
      db.updateUser(helper.id, { points: helper.points + 25 });
    }
  }

  broadcastToRoom(req.params.id, { type: 'test_result', room: updated });
  sendSuccess(res, { isPassing, testOutput, room: updated });
});

// Publish Solution Sheet from Room
app.post('/api/rooms/:id/publish-solution', (req: Request, res: Response) => {
  const room = db.getRoom(req.params.id);
  if (!room) return sendError(res, 'ROOM_NOT_FOUND', 'Salle introuvable', 404);

  const { title, problem, cause, solution, codeSnippet } = req.body;
  if (!title || !problem || !solution) {
    return sendError(res, 'MISSING_FIELDS', 'Titre, problème et solution requis');
  }

  const newSol = db.createSolution({
    title,
    problem,
    cause: cause || 'Configuration manquante ou dépendance non spécifiée.',
    solution,
    codeSnippet: codeSnippet || room.code,
    stackTag: room.stackTag,
    authorId: room.requesterId,
    authorName: room.requesterName,
    helperId: room.helperId,
    helperName: room.helperName,
  });

  db.updateRoom(room.id, { solutionSheetId: newSol.id, status: 'resolved' });

  broadcastToAll({ type: 'solution_published', solution: newSol });
  sendSuccess(res, newSol, 201);
});

// Solution Sheets
app.get('/api/solutions', (req: Request, res: Response) => {
  sendSuccess(res, db.getSolutions());
});

app.get('/api/solutions/:id', (req: Request, res: Response) => {
  const sol = db.getSolution(req.params.id);
  if (!sol) return sendError(res, 'SOLUTION_NOT_FOUND', 'Fiche solution introuvable', 404);
  sendSuccess(res, sol);
});

// Projects
app.get('/api/projects', (req: Request, res: Response) => {
  sendSuccess(res, db.getProjects());
});

app.get('/api/projects/:id', (req: Request, res: Response) => {
  const proj = db.getProject(req.params.id);
  if (!proj) return sendError(res, 'PROJECT_NOT_FOUND', 'Projet introuvable', 404);
  sendSuccess(res, proj);
});

app.post('/api/projects', (req: Request, res: Response) => {
  const { name, description, demoUrl, repoUrl, rolesNeeded, authorId, authorName, city } = req.body;
  if (!name || !description || !authorId) {
    return sendError(res, 'INVALID_INPUT', 'Le nom, la description et l auteur sont requis');
  }
  const created = db.createProject({
    name,
    description,
    demoUrl,
    repoUrl,
    rolesNeeded: rolesNeeded || ['Développeur'],
    authorId,
    authorName: authorName || 'Développeur KoraDevs',
    city: city || 'Cotonou',
  });
  sendSuccess(res, created, 201);
});

app.patch('/api/projects/:id/tasks/:taskId', (req: Request, res: Response) => {
  const { status } = req.body;
  const updated = db.updateProjectTask(req.params.id, req.params.taskId, status);
  if (!updated) return sendError(res, 'PROJECT_NOT_FOUND', 'Projet ou tâche introuvable', 404);
  sendSuccess(res, updated);
});

app.post('/api/projects/:id/tasks', (req: Request, res: Response) => {
  const { title } = req.body;
  if (!title) return sendError(res, 'MISSING_TITLE', 'Le titre de la tâche est requis');
  const updated = db.addProjectTask(req.params.id, title);
  if (!updated) return sendError(res, 'PROJECT_NOT_FOUND', 'Projet introuvable', 404);
  sendSuccess(res, updated);
});

app.post('/api/projects/:id/join', (req: Request, res: Response) => {
  const { userId, userName, message } = req.body;
  if (!userId || !userName || !message) {
    return sendError(res, 'MISSING_PARAMS', 'userId, userName et message sont requis');
  }
  try {
    const joinReq = db.createJoinRequest(req.params.id, userId, userName, message);
    sendSuccess(res, joinReq, 201);
  } catch (err: any) {
    sendError(res, 'JOIN_FAILED', err.message);
  }
});

app.get('/api/projects/:id/join-requests', (req: Request, res: Response) => {
  sendSuccess(res, db.getJoinRequests(req.params.id));
});

// Passport
app.get('/api/passport/:userId', (req: Request, res: Response) => {
  const passport = db.getPassport(req.params.userId);
  if (!passport) return sendError(res, 'USER_NOT_FOUND', 'Passeport introuvable pour cet utilisateur', 404);
  sendSuccess(res, passport);
});

// Reports
app.post('/api/reports', (req: Request, res: Response) => {
  const parse = ReportSchema.safeParse(req.body);
  if (!parse.success) return sendError(res, 'INVALID_INPUT', 'Données de signalement invalides');
  const rep = db.createReport(parse.data.targetType, parse.data.targetId, parse.data.reason, parse.data.details);
  sendSuccess(res, rep, 201);
});

// Central 404 Handler
app.use((req: Request, res: Response) => {
  sendError(res, 'NOT_FOUND', `Route API introuvable : ${req.method} ${req.url}`, 404);
});

// Central Error Handler Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('🔥 Erreur serveur non gérée:', err);
  sendError(res, 'INTERNAL_SERVER_ERROR', 'Une erreur serveur inattendue est survenue.', 500);
});

// ----------------------------------------------------
// HTTP SERVER & WEBSOCKET SETUP
// ----------------------------------------------------
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

interface ConnectedClient {
  ws: WebSocket;
  roomId?: string;
  userId?: string;
  userName?: string;
}

const clients = new Set<ConnectedClient>();

wss.on('connection', (ws: WebSocket) => {
  const client: ConnectedClient = { ws };
  clients.add(client);

  ws.on('message', (messageRaw: string) => {
    try {
      const msg = JSON.parse(messageRaw.toString());

      if (msg.type === 'join_room') {
        client.roomId = msg.roomId;
        client.userId = msg.userId;
        client.userName = msg.userName;
        broadcastToRoom(msg.roomId, {
          type: 'user_joined',
          userId: msg.userId,
          userName: msg.userName,
        });
      } else if (msg.type === 'code_change') {
        if (client.roomId) {
          db.updateRoom(client.roomId, { code: msg.code });
          broadcastToRoom(client.roomId, {
            type: 'code_updated',
            code: msg.code,
            userId: msg.userId,
          }, client);
        }
      } else if (msg.type === 'cursor_move') {
        if (client.roomId) {
          broadcastToRoom(client.roomId, {
            type: 'cursor_updated',
            userId: msg.userId,
            userName: msg.userName,
            cursor: msg.cursor,
          }, client);
        }
      } else if (msg.type === 'typing_indicator') {
        if (client.roomId) {
          broadcastToRoom(client.roomId, {
            type: 'typing_updated',
            userId: msg.userId,
            userName: msg.userName,
            isTyping: msg.isTyping,
          }, client);
        }
      } else if (msg.type === 'chat_message') {
        if (client.roomId && msg.text) {
          const room = db.getRoom(client.roomId);
          if (room) {
            const newMsg = {
              id: `msg-${Date.now()}`,
              senderId: msg.senderId || client.userId || 'anon',
              senderName: msg.senderName || client.userName || 'Utilisateur',
              text: msg.text,
              timestamp: new Date().toISOString(),
            };
            room.chat.push(newMsg);
            db.updateRoom(room.id, { chat: room.chat });
            broadcastToRoom(client.roomId, {
              type: 'chat_updated',
              chatMessage: newMsg,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Erreur décodage WS:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(client);
    if (client.roomId && client.userId) {
      broadcastToRoom(client.roomId, {
        type: 'user_left',
        userId: client.userId,
        userName: client.userName,
      });
    }
  });
});

function broadcastToRoom(roomId: string, messageObj: any, senderClient?: ConnectedClient) {
  const payload = JSON.stringify(messageObj);
  clients.forEach((c) => {
    if (c.roomId === roomId && c !== senderClient && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  });
}

function broadcastToAll(messageObj: any) {
  const payload = JSON.stringify(messageObj);
  clients.forEach((c) => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(payload);
    }
  });
}

httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur KoraDevs + CodeFlash démarré sur http://localhost:${PORT}`);
  console.log(`📡 Point d accès WebSocket disponible sur ws://localhost:${PORT}/ws`);
  console.log(`❤️ Route de santé : http://localhost:${PORT}/api/health`);
});

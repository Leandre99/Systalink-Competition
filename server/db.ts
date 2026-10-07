import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  HelpRequest,
  Room,
  SolutionSheet,
  Project,
  JoinRequest,
  Report,
  Passport,
  maskSecrets,
} from '../shared/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

export interface DatabaseState {
  users: User[];
  helpRequests: HelpRequest[];
  rooms: Room[];
  solutions: SolutionSheet[];
  projects: Project[];
  joinRequests: JoinRequest[];
  reports: Report[];
}

export const INITIAL_DEMO_DATA: DatabaseState = {
  users: [
    {
      id: 'user-koffi',
      name: 'Koffi Mensah',
      email: 'koffi@koradevs.bj',
      city: 'Cotonou',
      stack: ['React', 'Node.js', 'TypeScript', 'Tailwind'],
      bio: 'Développeur Fullstack junior à Cotonou. Passionné par le web et la communauté.',
      doorOpen: true,
      points: 120,
      role: 'demandeur',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    },
    {
      id: 'user-aicha',
      name: 'Aïcha Diop',
      email: 'aicha@koradevs.sn',
      city: 'Dakar',
      stack: ['Python', 'TypeScript', 'React', 'FastAPI', 'Docker'],
      bio: 'Lead dev backend à Dakar. Toujours disponible pour prêter main-forte aux voisins.',
      doorOpen: true,
      points: 480,
      role: 'aidant',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    },
    {
      id: 'user-samba',
      name: 'Samba Sow',
      email: 'samba@koradevs.ci',
      city: 'Abidjan',
      stack: ['Flutter', 'Node.js', 'PostgreSQL'],
      bio: 'Architecte Mobile & Cloud à Abidjan. Adepte du test-driven development.',
      doorOpen: false,
      points: 310,
      role: 'mentor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    },
  ],
  helpRequests: [
    {
      id: 'req-1',
      title: 'Erreur CORS sur API Express avec React Vite',
      description: 'Mon application React client bloque lors des appels POST vers mon serveur local Express. Le navigateur affiche "Blocked by CORS policy".',
      code: `fetch('http://localhost:3001/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: "SECRET_API_KEY_9921" })
});`,
      cleanCode: `fetch('http://localhost:3001/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: "***[SECRET MASQUÉ POUR SÉCURITÉ]***" })
});`,
      secretsMaskedCount: 1,
      stackTag: 'React',
      status: 'pending',
      requesterId: 'user-koffi',
      requesterName: 'Koffi Mensah',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'req-2',
      title: 'Crash Async/Await dans useEffect sans cleanup',
      description: 'L effect React s exécute en boucle infinie quand je tente de charger les données utilisateur.',
      code: `useEffect(() => {
  async function load() {
    const res = await fetch('/api/user');
    setUser(await res.json());
  }
  load();
});`,
      cleanCode: `useEffect(() => {
  async function load() {
    const res = await fetch('/api/user');
    setUser(await res.json());
  }
  load();
}, []);`,
      secretsMaskedCount: 0,
      stackTag: 'TypeScript',
      status: 'pending',
      requesterId: 'user-koffi',
      requesterName: 'Koffi Mensah',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  rooms: [
    {
      id: 'room-demo',
      requestId: 'req-1',
      requestTitle: 'Erreur CORS sur API Express avec React Vite',
      stackTag: 'React',
      requesterId: 'user-koffi',
      requesterName: 'Koffi Mensah',
      helperId: 'user-aicha',
      helperName: 'Aïcha Diop',
      code: `// Express server setup
import express from 'express';
import cors from 'cors';

const app = express();

// CORRECTION: Ajouter la configuration CORS appropriée
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.post('/api/data', (req, res) => {
  res.json({ ok: true, message: "Connexion réussie !" });
});

// Test de vérification
export function testCorsHandler() {
  return true;
}`,
      chat: [
        {
          id: 'msg-1',
          senderId: 'user-koffi',
          senderName: 'Koffi Mensah',
          text: 'Salut Aïcha ! Mon serveur Express rejette mes requêtes avec une erreur CORS.',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'msg-2',
          senderId: 'user-aicha',
          senderName: 'Aïcha Diop',
          text: 'Salut Koffi ! J ai jeté un œil à ton code. Il manque le middleware cors() sur ton serveur. On va le corriger ensemble.',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
        },
      ],
      testStatus: 'idle',
      testOutput: '',
      confirmed: false,
      requesterApproved: false,
      helperApproved: false,
      status: 'active',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
  solutions: [
    {
      id: 'sol-1',
      title: 'Résoudre les requêtes CORS bloquées entre React Vite et Express',
      problem: 'Les requêtes HTTP POST envoyées depuis React Vite (port 5173) vers Express (port 3001) échouent avec une erreur de politique CORS.',
      cause: 'Le serveur Express ne renvoyait pas l en-tête Access-Control-Allow-Origin autorisant l origine du client.',
      solution: 'Installer le middleware cors, l appliquer avant les routes et spécifier origin: "http://localhost:5173".',
      codeSnippet: `import cors from 'cors';
app.use(cors({ origin: 'http://localhost:5173' }));`,
      stackTag: 'React',
      authorId: 'user-koffi',
      authorName: 'Koffi Mensah',
      helperId: 'user-aicha',
      helperName: 'Aïcha Diop',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      upvotes: 14,
      proofHash: 'hash-proof-cors-2026-cadev',
    },
    {
      id: 'sol-2',
      title: 'Éviter les boucles infinies async avec useEffect en React',
      problem: 'Le composant React boucle indéfiniment lors du chargement des données d API.',
      cause: 'L absence du tableau de dépendances dans useEffect réexécutait la fonction à chaque rendu.',
      solution: 'Passer un tableau de dépendances vide [] pour exécuter la fonction uniquement au montage du composant.',
      codeSnippet: `useEffect(() => {
  fetchData();
}, []);`,
      stackTag: 'React',
      authorId: 'user-samba',
      authorName: 'Samba Sow',
      helperId: 'user-aicha',
      helperName: 'Aïcha Diop',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      upvotes: 28,
      proofHash: 'hash-proof-useeffect-2026',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'KoraCode CLI & SDK',
      description: 'Suite d outils open-source CLI et SDK pour accélérer le développement d applications Web3 & PWA en Afrique.',
      demoUrl: 'https://koracode.dev',
      repoUrl: 'https://github.com/koradevs/koracode-sdk',
      rolesNeeded: ['Développeur Rust / Node.js', 'Designer UI/UX', 'Dev Backend TypeScript'],
      authorId: 'user-koffi',
      authorName: 'Koffi Mensah',
      city: 'Cotonou',
      membersCount: 3,
      tasks: [
        { id: 'task-1', title: 'Concevoir la commande CLI init', status: 'done', assigneeName: 'Koffi Mensah' },
        { id: 'task-2', title: 'Connecter l API de génération de tokens', status: 'in_progress', assigneeName: 'Aïcha Diop' },
        { id: 'task-3', title: 'Ajouter l export des certificats PDF', status: 'todo' },
      ],
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'proj-2',
      name: 'EduDev WestAfrica',
      description: 'Ressources éducatives hors-ligne et fiches interactives pour étudiants en informatique.',
      demoUrl: 'https://edudev.africa',
      repoUrl: 'https://github.com/koradevs/edudev',
      rolesNeeded: ['Rédacteur de fiches', 'Développeur React', 'Traducteur'],
      authorId: 'user-samba',
      authorName: 'Samba Sow',
      city: 'Abidjan',
      membersCount: 5,
      tasks: [
        { id: 'task-10', title: 'Rédiger le cours TypeScript basique', status: 'done', assigneeName: 'Samba Sow' },
        { id: 'task-11', title: 'Implémenter le lecteur PWA', status: 'in_progress' },
      ],
      createdAt: new Date(Date.now() - 518400000).toISOString(),
    },
  ],
  joinRequests: [
    {
      id: 'join-1',
      projectId: 'proj-1',
      projectName: 'KoraCode CLI & SDK',
      userId: 'user-aicha',
      userName: 'Aïcha Diop',
      message: 'Je souhaite prêter main forte sur la partie API Backend Node.js et Docker !',
      status: 'accepted',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  reports: [],
};

class DB {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Erreur lecture DB, initialisation démo:', err);
    }
    return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }

  public save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erreur écriture DB:', err);
    }
  }

  public resetToDemo() {
    this.state = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
    this.save();
  }

  // Users
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUser(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public updateUser(id: string, update: Partial<User>): User | undefined {
    const idx = this.state.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.state.users[idx] = { ...this.state.users[idx], ...update };
    this.save();
    return this.state.users[idx];
  }

  // Help Requests
  public getHelpRequests(): HelpRequest[] {
    return this.state.helpRequests;
  }

  public getHelpRequest(id: string): HelpRequest | undefined {
    return this.state.helpRequests.find((r) => r.id === id);
  }

  public createHelpRequest(data: {
    title: string;
    description: string;
    code: string;
    stackTag: string;
    requesterId: string;
    requesterName: string;
    status?: 'pending' | 'matched' | 'resolved' | 'closed';
  }): HelpRequest {
    const { maskedText, secretsCount } = maskSecrets(data.code || '');
    const newReq: HelpRequest = {
      ...data,
      id: `req-${Date.now()}`,
      cleanCode: maskedText,
      secretsMaskedCount: secretsCount,
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.helpRequests.unshift(newReq);
    this.save();
    return newReq;
  }

  public updateHelpRequest(id: string, update: Partial<HelpRequest>): HelpRequest | undefined {
    const idx = this.state.helpRequests.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.state.helpRequests[idx] = { ...this.state.helpRequests[idx], ...update, updatedAt: new Date().toISOString() };
    this.save();
    return this.state.helpRequests[idx];
  }

  // Rooms
  public getRooms(): Room[] {
    return this.state.rooms;
  }

  public getRoom(id: string): Room | undefined {
    return this.state.rooms.find((r) => r.id === id);
  }

  public createRoom(requestId: string, helperId: string, helperName: string): Room {
    const req = this.getHelpRequest(requestId);
    if (!req) throw new Error('Demande introuvable');

    req.status = 'matched';
    req.helperId = helperId;
    req.helperName = helperName;
    this.save();

    const existing = this.state.rooms.find((r) => r.requestId === requestId);
    if (existing) return existing;

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      requestId: req.id,
      requestTitle: req.title,
      stackTag: req.stackTag,
      requesterId: req.requesterId,
      requesterName: req.requesterName,
      helperId,
      helperName,
      code: req.cleanCode || req.code,
      chat: [
        {
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'Système KoraDevs',
          text: `La session d entraide CodeFlash est ouverte entre ${req.requesterName} et ${helperName}.`,
          timestamp: new Date().toISOString(),
        },
      ],
      testStatus: 'idle',
      testOutput: '',
      confirmed: false,
      requesterApproved: false,
      helperApproved: false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.state.rooms.unshift(newRoom);
    this.save();
    return newRoom;
  }

  public updateRoom(id: string, update: Partial<Room>): Room | undefined {
    const idx = this.state.rooms.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.state.rooms[idx] = { ...this.state.rooms[idx], ...update };
    this.save();
    return this.state.rooms[idx];
  }

  // Solutions
  public getSolutions(): SolutionSheet[] {
    return this.state.solutions;
  }

  public getSolution(id: string): SolutionSheet | undefined {
    return this.state.solutions.find((s) => s.id === id);
  }

  public createSolution(data: Omit<SolutionSheet, 'id' | 'publishedAt' | 'upvotes' | 'proofHash'>): SolutionSheet {
    const newSol: SolutionSheet = {
      ...data,
      id: `sol-${Date.now()}`,
      publishedAt: new Date().toISOString(),
      upvotes: 1,
      proofHash: `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
    this.state.solutions.unshift(newSol);
    
    // Enrich helper user points
    const helper = this.getUser(data.helperId);
    if (helper) {
      helper.points += 50;
      this.save();
    }

    this.save();
    return newSol;
  }

  // Projects
  public getProjects(): Project[] {
    return this.state.projects;
  }

  public getProject(id: string): Project | undefined {
    return this.state.projects.find((p) => p.id === id);
  }

  public createProject(data: Omit<Project, 'id' | 'createdAt' | 'membersCount' | 'tasks'>): Project {
    const newProj: Project = {
      ...data,
      id: `proj-${Date.now()}`,
      membersCount: 1,
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    this.state.projects.unshift(newProj);
    this.save();
    return newProj;
  }

  public updateProjectTask(projectId: string, taskId: string, status: 'todo' | 'in_progress' | 'done'): Project | undefined {
    const proj = this.getProject(projectId);
    if (!proj) return undefined;
    const task = proj.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      this.save();
    }
    return proj;
  }

  public addProjectTask(projectId: string, title: string): Project | undefined {
    const proj = this.getProject(projectId);
    if (!proj) return undefined;
    proj.tasks.push({
      id: `task-${Date.now()}`,
      title,
      status: 'todo',
    });
    this.save();
    return proj;
  }

  // Join Requests
  public getJoinRequests(projectId?: string): JoinRequest[] {
    if (projectId) {
      return this.state.joinRequests.filter((j) => j.projectId === projectId);
    }
    return this.state.joinRequests;
  }

  public createJoinRequest(projectId: string, userId: string, userName: string, message: string): JoinRequest {
    const proj = this.getProject(projectId);
    if (!proj) throw new Error('Projet introuvable');
    const newReq: JoinRequest = {
      id: `join-${Date.now()}`,
      projectId,
      projectName: proj.name,
      userId,
      userName,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.state.joinRequests.unshift(newReq);
    this.save();
    return newReq;
  }

  // Passport
  public getPassport(userId: string): Passport | undefined {
    const user = this.getUser(userId);
    if (!user) return undefined;

    const helpsConfirmed = this.state.rooms.filter(
      (r) => (r.helperId === userId || r.requesterId === userId) && r.confirmed
    );

    const userSolutions = this.state.solutions.filter(
      (s) => s.authorId === userId || s.helperId === userId
    );

    const proofs = [
      ...userSolutions.map((s) => ({
        id: `proof-${s.id}`,
        type: 'solution_published' as const,
        title: `Fiche publiée : ${s.title}`,
        detail: `Co-créée avec ${s.authorId === userId ? s.helperName : s.authorName}`,
        url: `/solutions/${s.id}`,
        hash: s.proofHash,
        timestamp: s.publishedAt,
      })),
      ...helpsConfirmed.map((r) => ({
        id: `proof-${r.id}`,
        type: 'help_confirmed' as const,
        title: `Entraide confirmée par test : ${r.requestTitle}`,
        detail: `Session CodeFlash avec ${r.requesterId === userId ? r.helperName : r.requesterName}`,
        url: `/room/${r.id}`,
        hash: `hash-help-${r.id}`,
        timestamp: r.createdAt,
      })),
    ];

    return {
      userId: user.id,
      userName: user.name,
      userCity: user.city,
      bio: user.bio,
      stack: user.stack,
      points: user.points,
      helpsCount: helpsConfirmed.length + userSolutions.length,
      solutionsCount: userSolutions.length,
      proofs,
      signatureHash: `SIG-KORADEVS-2026-${user.id.toUpperCase()}-${user.points}PTS`,
      signedAt: new Date().toISOString(),
    };
  }

  // Reports
  public createReport(targetType: 'solution' | 'project' | 'user', targetId: string, reason: string, details?: string): Report {
    const rep: Report = {
      id: `rep-${Date.now()}`,
      targetType,
      targetId,
      reason,
      details,
      createdAt: new Date().toISOString(),
    };
    this.state.reports.unshift(rep);
    this.save();
    return rep;
  }
}

export const db = new DB();

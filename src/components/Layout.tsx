import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  HelpCircle,
  Radar,
  FolderGit2,
  Award,
  Home,
  BookOpen,
  PlayCircle,
  Bell,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getOfflineQueue, processOfflineQueue } from '../lib/api';
import { User } from '@shared/index';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  onOpenDoorbell?: () => void;
}

const NAV_ITEMS = [
  { path: '/discover', label: 'Découvrir', icon: Compass },
  { path: '/ask', label: 'Demander de l’aide', icon: HelpCircle },
  { path: '/radar', label: 'Aider', icon: Radar },
  { path: '/projects', label: 'Projets', icon: FolderGit2 },
  { path: '/passport', label: 'Passeport', icon: Award },
  { path: '/maison', label: 'Ma Maison', icon: Home },
];

const PAGE_META: Record<string, { title: string; subtitle: string; actionLabel?: string; actionPath?: string }> = {
  '/': { title: 'Découvrir', subtitle: 'Explore les fiches de solutions récentes, les voisins prêts à aider et les projets en quête de coéquipiers.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/discover': { title: 'Découvrir', subtitle: 'Explore les fiches de solutions récentes, les voisins prêts à aider et les projets en quête de coéquipiers.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/ask': { title: 'Demander de l’aide', subtitle: 'Colle ton erreur et ton code : les clés privées sont masquées automatiquement avant envoi.', actionLabel: 'Voir le Radar', actionPath: '/radar' },
  '/radar': { title: 'Radar des aidants', subtitle: 'Vois en direct les requêtes d’entraide correspondant à ta stack et rejoins une session CodeFlash.', actionLabel: 'Ma Maison', actionPath: '/maison' },
  '/projects': { title: 'Vitrine de projets', subtitle: 'Présente tes projets, recherche des coéquipiers et rejoins des chantiers en cours.', actionLabel: 'Publier un projet', actionPath: '/projects/new' },
  '/passport': { title: 'Passeport de compétences', subtitle: 'Ton profil public de compétences certifiées avec preuves d’entraide et signatures infalsifiables.', actionLabel: 'Exporter en PDF', actionPath: 'export_pdf' },
  '/maison': { title: 'Ma Maison', subtitle: 'Gère ta stack technique, ta ville, et ouvre ta porte aux voisins qui ont besoin d’aide.', actionLabel: 'Sonner chez un voisin', actionPath: 'ring_bell' },
  '/guide': { title: 'Guide de la plateforme', subtitle: 'Le plan complet de KoraDevs + CodeFlash et le lancement de la visite guidée.', actionLabel: 'Démarrer la visite', actionPath: 'start_tour' },
  '/demo': { title: 'Parcours de Démonstration', subtitle: 'Déroule le scénario complet de 2 minutes et bascule entre le compte demandeur et aidant.', actionLabel: 'Réinitialiser la démo', actionPath: 'reset_demo' },
  '/solutions': { title: 'Bibliothèque de solutions', subtitle: 'Toutes les fiches de solutions co-créées et confirmées par des tests.', actionLabel: 'Demander de l’aide', actionPath: '/ask' },
};

export const Layout: React.FC<LayoutProps> = ({ children, currentUser, setCurrentUser, onOpenDoorbell }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(getOfflineQueue().length);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await processOfflineQueue();
      if (synced > 0) {
        setToastMessage(`✅ ${synced} action(s) hors-ligne synchronisée(s) avec succès !`);
        setTimeout(() => setToastMessage(null), 4000);
      }
      setOfflineQueueCount(getOfflineQueue().length);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage('⚠️ Connexion interrompue — tes actions seront synchronisées dès que le réseau revient.');
      setTimeout(() => setToastMessage(null), 5000);
    };

    const handleQueueUpdate = () => {
      setOfflineQueueCount(getOfflineQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline_queue_updated', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline_queue_updated', handleQueueUpdate);
    };
  }, []);

  let currentMeta = PAGE_META[location.pathname];
  if (!currentMeta) {
    if (location.pathname.startsWith('/room/')) {
      currentMeta = {
        title: 'Salle d’aide CodeFlash',
        subtitle: 'Édition partagée en temps réel, chat et exécution de test avec confirmation.',
        actionLabel: 'Quitter la salle',
        actionPath: '/radar',
      };
    } else if (location.pathname.startsWith('/solutions/')) {
      currentMeta = {
        title: 'Fiche Solution',
        subtitle: 'Solution confirmée par test et publiée avec le double accord.',
        actionLabel: 'Toutes les fiches',
        actionPath: '/solutions',
      };
    } else if (location.pathname.startsWith('/projects/')) {
      currentMeta = {
        title: 'Détails du Projet',
        subtitle: 'Fiche projet, tâches en cours et demandes d’adhésion.',
        actionLabel: 'Tous les projets',
        actionPath: '/projects',
      };
    } else {
      currentMeta = {
        title: 'KoraDevs + CodeFlash',
        subtitle: 'Plateforme africaine moderne d’entraide et de collaboration pour développeurs.',
      };
    }
  }

  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] text-[#0F172A]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#0F172A] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-slide-in">
          <Bell className="w-5 h-5 text-[#F59E0B] shrink-0 animate-bell-swing" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR (Navy Dark #0F172A) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] text-white shrink-0 shadow-2xl min-h-screen border-r border-slate-800">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-[#2563EB] flex items-center justify-center font-black text-xl text-white shadow-blue">
              ⚡
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight leading-none text-white flex items-center gap-1">
                KoraDevs <span className="text-[#2563EB] text-xs font-black uppercase">CodeFlash</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Entraide & Tech Africaine</p>
            </div>
          </Link>
        </div>

        {/* User Card */}
        <div className="px-4 py-3.5 mx-3 my-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover border-2 border-[#2563EB]" />
            <div className="truncate">
              <p className="text-xs font-bold truncate text-white">{currentUser.name}</p>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span>
                {currentUser.city} • <strong className="text-[#F59E0B] font-bold">{currentUser.points} pts</strong>
              </p>
            </div>
          </div>
          {currentUser.doorOpen && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 shrink-0">
              Ouvert
            </span>
          )}
        </div>

        {/* Navigation Menu (Active: Light Blue #EFF6FF background + Blue #2563EB text) */}
        <nav className="flex-1 px-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/discover' && location.pathname === '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: isSelfActive }) => {
                  const active = isActive || isSelfActive;
                  return `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 relative ${
                    active
                      ? 'bg-[#EFF6FF] text-[#2563EB] shadow-sm font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`;
                }}
              >
                {({ isActive: isSelfActive }) => {
                  const active = isActive || isSelfActive;
                  return (
                    <>
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#2563EB] rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>

        {/* Secondary Links: Guide & Demo */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            to="/guide"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === '/guide' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#2563EB]" />
            <span>Guide (/guide)</span>
          </Link>
          <Link
            to="/demo"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === '/demo' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-[#F59E0B]" />
            <span>Démo (/demo)</span>
          </Link>
        </div>

        {/* Network Status Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></span>
                <span className="font-semibold text-slate-300">En ligne</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#E4572E] animate-ping"></span>
                <span className="text-red-400 font-bold">Hors-ligne</span>
              </>
            )}
          </div>
          {offlineQueueCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-[#F59E0B] rounded-md text-[10px] font-bold border border-amber-500/30">
              {offlineQueueCount} sync
            </span>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* HEADER */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-4 md:px-8 md:py-6 shadow-sm sticky top-0 z-30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Breadcrumbs */}
              {pathParts.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
                  <Link to="/" className="hover:text-[#2563EB]">Accueil</Link>
                  {pathParts.map((part, index) => (
                    <React.Fragment key={index}>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="capitalize font-semibold text-slate-700">
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <h2 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                {currentMeta.title}
              </h2>
              <p className="text-xs md:text-sm text-[#64748B] mt-0.5 max-w-2xl font-medium">
                {currentMeta.subtitle}
              </p>
            </div>

            {/* Primary Action Button (Primary Blue) */}
            {currentMeta.actionLabel && (
              <div className="shrink-0 flex items-center gap-3">
                {currentMeta.actionPath === 'ring_bell' && onOpenDoorbell ? (
                  <button
                    onClick={onOpenDoorbell}
                    className="btn-primary"
                  >
                    <Bell className="w-4 h-4 text-[#F59E0B] animate-bell-swing" />
                    <span>Sonner chez un voisin</span>
                  </button>
                ) : currentMeta.actionPath?.startsWith('/') ? (
                  <Link
                    to={currentMeta.actionPath}
                    className="btn-primary"
                  >
                    <span>{currentMeta.actionLabel}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </header>

        {/* MAIN ROUTE CONTENT WITH FRAMER MOTION TRANSITIONS */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 px-4 py-6 md:px-8 md:py-10 max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM NAV BAR (360px+) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] text-white border-t border-slate-800 z-40 px-2 py-2 flex justify-around items-center shadow-2xl">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/discover' && location.pathname === '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                isActive ? 'text-[#2563EB] bg-[#EFF6FF]/10 scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`} />
              <span className="truncate max-w-[62px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

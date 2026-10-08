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
  Wifi,
  WifiOff,
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
  { path: '/radar', label: 'Aider (Radar)', icon: Radar },
  { path: '/projects', label: 'Projets', icon: FolderGit2 },
  { path: '/passport', label: 'Passeport', icon: Award },
  { path: '/maison', label: 'Ma Maison', icon: Home },
];

const PAGE_META: Record<string, { title: string; subtitle: string; actionLabel?: string; actionPath?: string }> = {
  '/': { title: 'Découvrir', subtitle: 'Explore les solutions récentes, les voisins prêts à aider et les projets.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/discover': { title: 'Découvrir', subtitle: 'Explore les solutions récentes, les voisins prêts à aider et les projets.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/ask': { title: 'Demander de l’aide', subtitle: 'Nettoyage des secrets d’API et publication sur le Radar en temps réel.', actionLabel: 'Voir le Radar', actionPath: '/radar' },
  '/radar': { title: 'Radar des Aidants', subtitle: 'Rejoins les développeurs bloqués sur ta stack technique.', actionLabel: 'Ma Maison', actionPath: '/maison' },
  '/projects': { title: 'Vitrine Projets', subtitle: 'Présente tes projets tech et recrute des coéquipiers.', actionLabel: 'Nouveau projet', actionPath: '/projects/new' },
  '/passport': { title: 'Passeport Compétences', subtitle: 'Compétences vérifiées par tests et signées cryptographiquement.', actionLabel: 'Exporter en PDF', actionPath: 'export_pdf' },
  '/maison': { title: 'Ma Maison', subtitle: 'Stack technique, statut Porte Ouverte et historique d’entraide.', actionLabel: 'Sonner chez un voisin', actionPath: 'ring_bell' },
  '/guide': { title: 'Guide Plateforme', subtitle: 'Architecture complète des 13 fonctionnalités KoraDevs + CodeFlash.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/demo': { title: 'Parcours Démo', subtitle: 'Scénario complet Hackathon CADev 2026 en 2 minutes.', actionLabel: 'Réinitialiser démo', actionPath: 'reset_demo' },
  '/solutions': { title: 'Fiches Solutions', subtitle: 'Solutions confirmées par tests automatisés.', actionLabel: 'Demander de l’aide', actionPath: '/ask' },
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
        setToastMessage(`✅ ${synced} action(s) hors-ligne synchronisée(s) !`);
        setTimeout(() => setToastMessage(null), 4000);
      }
      setOfflineQueueCount(getOfflineQueue().length);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage('⚠️ Mode hors-ligne actif — tes actions seront synchronisées dès le retour du réseau.');
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
        title: 'Salle CodeFlash',
        subtitle: 'Mini-IDE collaboratif en direct, exécution du test et confirmation officielle.',
        actionLabel: 'Quitter la salle',
        actionPath: '/radar',
      };
    } else if (location.pathname.startsWith('/solutions/')) {
      currentMeta = {
        title: 'Fiche Solution',
        subtitle: 'Solution confirmée par le test et publiée avec double accord.',
        actionLabel: 'Toutes les fiches',
        actionPath: '/solutions',
      };
    } else if (location.pathname.startsWith('/projects/')) {
      currentMeta = {
        title: 'Détails Projet',
        subtitle: 'Chantiers ouverts et tableau de tâches Kanban.',
        actionLabel: 'Tous les projets',
        actionPath: '/projects',
      };
    } else {
      currentMeta = {
        title: 'KoraDevs + CodeFlash',
        subtitle: 'Quartier numérique ouest-africain d’entraide entre développeurs.',
      };
    }
  }

  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] text-[#0F172A]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#0A1118] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-in">
          <Bell className="w-4 h-4 text-[#F2A93B] shrink-0 animate-bell-swing" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A1118] text-white shrink-0 shadow-xl min-h-screen border-r border-[#1E2E40]">
        {/* Brand */}
        <div className="p-5 border-b border-[#1E2E40] bg-gradient-to-b from-[#101A24] to-[#0A1118]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F6E56] to-[#0A4F3E] flex items-center justify-center font-black text-lg text-[#F2A93B] border border-emerald-500/30 group-hover:scale-105 transition-transform shadow-sm">
              ⚡
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-tight text-white flex items-center gap-1.5">
                <span>KoraDevs</span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-[#F2A93B] text-[#0A1118]">CodeFlash</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]"></span>
                Quartier Tech Africain
              </p>
            </div>
          </Link>
        </div>

        {/* User Card */}
        <div className="px-3.5 py-3 mx-3 my-3 bg-[#101A24] rounded-xl border border-[#1E2E40] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-[#0F6E56]" />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#101A24]"></span>
            </div>
            <div className="truncate">
              <p className="text-xs font-bold truncate text-white">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser.city} • <strong className="text-[#F2A93B] font-bold">{currentUser.points} pts</strong>
              </p>
            </div>
          </div>
          {currentUser.doorOpen && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-[#0F6E56]/40 text-emerald-300 rounded-full border border-[#0F6E56]/60 shrink-0">
              Ouvert
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/discover' && location.pathname === '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={() => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 relative ${
                  isActive
                    ? 'bg-[#0F6E56] text-white shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-[#142230] hover:text-white'
                }`}
              >
                {() => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F2A93B]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Secondary Links */}
        <div className="p-3 border-t border-[#1E2E40] space-y-1 bg-[#0A1118]">
          <Link
            to="/guide"
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              location.pathname === '/guide' ? 'bg-[#101A24] text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-[#101A24]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guide des 13 Fonctions</span>
          </Link>
          <Link
            to="/demo"
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              location.pathname === '/demo' ? 'bg-[#101A24] text-[#F2A93B]' : 'text-slate-400 hover:text-white hover:bg-[#101A24]'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 text-[#F2A93B]" />
            <span>Démo 2 Min (/demo)</span>
          </Link>
        </div>

        {/* Network & Offline Status Footer */}
        <div className="p-3.5 border-t border-[#1E2E40] text-[11px] text-slate-400 flex items-center justify-between bg-[#080D13]">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300">En ligne (CADev)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#E4572E] animate-pulse" />
                <span className="text-red-400 font-bold">Hors-ligne (PWA)</span>
              </>
            )}
          </div>
          {offlineQueueCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-[#F2A93B] rounded-md text-[10px] font-bold border border-amber-500/30">
              {offlineQueueCount} sync
            </span>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* SLIM CLEAN HEADER (Opaque, never overlaps) */}
        <header className="bg-white border-b border-slate-200/90 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Brand Icon */}
            <div className="md:hidden w-8 h-8 rounded-lg bg-[#0F6E56] flex items-center justify-center font-black text-xs text-[#F2A93B]">
              ⚡
            </div>

            <div>
              {/* Breadcrumbs for deep paths */}
              {pathParts.length > 1 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Link to="/" className="hover:text-[#0F6E56]">Accueil</Link>
                  {pathParts.map((part, index) => (
                    <React.Fragment key={index}>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="capitalize font-semibold text-slate-600">{part}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                {currentMeta.title}
              </h2>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Live Indicator Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-[#0F6E56] border border-emerald-200/70">
              <span className="w-2 h-2 rounded-full bg-[#0F6E56] animate-pulse"></span>
              <span>Réseau Live</span>
            </div>

            {/* Header Action Button */}
            {currentMeta.actionLabel && (
              <div>
                {currentMeta.actionPath === 'ring_bell' && onOpenDoorbell ? (
                  <button onClick={onOpenDoorbell} className="btn-amber py-1.5 px-3.5 text-xs">
                    <Bell className="w-3.5 h-3.5 text-white animate-bell-swing" />
                    <span>Sonner chez un voisin</span>
                  </button>
                ) : currentMeta.actionPath?.startsWith('/') ? (
                  <Link to={currentMeta.actionPath} className="btn-primary py-1.5 px-3.5 text-xs">
                    <span>{currentMeta.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </header>

        {/* MAIN ROUTE CONTENT */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A1118]/95 backdrop-blur-lg text-white border-t border-[#1E2E40] z-40 px-2 py-2 flex justify-around items-center shadow-2xl">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/discover' && location.pathname === '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                isActive ? 'text-[#F2A93B] bg-[#0F6E56]/30 scale-105 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#F2A93B]' : 'text-slate-400'}`} />
              <span className="truncate max-w-[62px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

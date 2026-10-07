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
  '/': { title: 'Découvrir le Quartier', subtitle: 'Explore les fiches de solutions récentes, les voisins prêts à aider et les projets en quête de coéquipiers.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/discover': { title: 'Découvrir le Quartier', subtitle: 'Explore les fiches de solutions récentes, les voisins prêts à aider et les projets en quête de coéquipiers.', actionLabel: 'Poser une question', actionPath: '/ask' },
  '/ask': { title: 'Appel à l’aide (SOS Dev)', subtitle: 'Colle ton erreur et ton code : les secrets d’API sont nettoyés et masqués en temps réel.', actionLabel: 'Voir le Radar', actionPath: '/radar' },
  '/radar': { title: 'Radar des Aidants', subtitle: 'Vois en direct les appels d’entraide correspondant à ta stack et rejoins une session CodeFlash.', actionLabel: 'Ma Maison', actionPath: '/maison' },
  '/projects': { title: 'Vitrine de Projets', subtitle: 'Présente tes projets tech, recherche des coéquipiers et rejoins des chantiers collaboratifs.', actionLabel: 'Publier un projet', actionPath: '/projects/new' },
  '/passport': { title: 'Passeport de Compétences', subtitle: 'Profil public de compétences vérifiées par le test automatique, certifiées par signature cryptographique.', actionLabel: 'Exporter en PDF', actionPath: 'export_pdf' },
  '/maison': { title: 'La Maison (Profil vivant)', subtitle: 'Gère ta stack technique, ta disponibilité (Porte Ouverte) et accueille tes voisins développeurs.', actionLabel: 'Sonner chez un voisin', actionPath: 'ring_bell' },
  '/guide': { title: 'Guide de la Plateforme', subtitle: 'Le plan complet de KoraDevs + CodeFlash et l’architecture des 13 fonctionnalités.', actionLabel: 'Démarrer la visite', actionPath: 'start_tour' },
  '/demo': { title: 'Parcours Démo 2 Min', subtitle: 'Scénario complet de présentation du Hackathon avec bascule multi-compte instantanée.', actionLabel: 'Réinitialiser la démo', actionPath: 'reset_demo' },
  '/solutions': { title: 'Bibliothèque de Solutions', subtitle: 'Toutes les fiches de solutions publiées avec le double accord et confirmées par le test.', actionLabel: 'Demander de l’aide', actionPath: '/ask' },
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
        title: 'Salle d’aide CodeFlash',
        subtitle: 'Mini-IDE collaboratif en temps réel, exécution du test et confirmation officielle.',
        actionLabel: 'Quitter la salle',
        actionPath: '/radar',
      };
    } else if (location.pathname.startsWith('/solutions/')) {
      currentMeta = {
        title: 'Fiche Solution',
        subtitle: 'Solution confirmée par le test et publiée avec le double accord des pairs.',
        actionLabel: 'Toutes les fiches',
        actionPath: '/solutions',
      };
    } else if (location.pathname.startsWith('/projects/')) {
      currentMeta = {
        title: 'Détails du Projet',
        subtitle: 'Fiche projet, chantiers ouverts et tableau de tâches Kanban.',
        actionLabel: 'Tous les projets',
        actionPath: '/projects',
      };
    } else {
      currentMeta = {
        title: 'KoraDevs + CodeFlash',
        subtitle: 'Quartier numérique ouest-africain d’entraide et de collaboration pour développeurs.',
      };
    }
  }

  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F6F8F7] text-[#0F172A]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#0A1118] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#1E2E40] animate-slide-in">
          <Bell className="w-5 h-5 text-[#F2A93B] shrink-0 animate-bell-swing" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR (Navy Dark #0A1118 with Emerald & Amber Accents) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A1118] text-white shrink-0 shadow-2xl min-h-screen border-r border-[#1E2E40]">
        {/* Brand */}
        <div className="p-6 border-b border-[#1E2E40] bg-gradient-to-b from-[#101A24] to-[#0A1118]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#0A4F3E] flex items-center justify-center font-black text-xl text-[#F2A93B] shadow-glow-emerald border border-emerald-500/30 group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight leading-none text-white flex items-center gap-1.5">
                <span>KoraDevs</span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-[#F2A93B] text-[#0A1118] tracking-wider">CodeFlash</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]"></span>
                Quartier Tech Africain
              </p>
            </div>
          </Link>
        </div>

        {/* User Card */}
        <div className="px-4 py-3.5 mx-3 my-4 bg-[#101A24] rounded-2xl border border-[#1E2E40] flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover border-2 border-[#0F6E56]" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#101A24]"></span>
            </div>
            <div className="truncate">
              <p className="text-xs font-bold truncate text-white">{currentUser.name}</p>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                {currentUser.city} • <strong className="text-[#F2A93B] font-extrabold">{currentUser.points} pts</strong>
              </p>
            </div>
          </div>
          {currentUser.doorOpen && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#0F6E56]/30 text-emerald-300 rounded-full border border-[#0F6E56]/50 shrink-0">
              Ouvert
            </span>
          )}
        </div>

        {/* Navigation Menu */}
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
                      ? 'bg-gradient-to-r from-[#0F6E56] to-[#0A4F3E] text-white shadow-glow-emerald border border-emerald-500/40 font-extrabold'
                      : 'text-slate-300 hover:bg-[#142230] hover:text-white'
                  }`;
                }}
              >
                {({ isActive: isSelfActive }) => {
                  const active = isActive || isSelfActive;
                  return (
                    <>
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#F2A93B] rounded-r-full" />
                      )}
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#F2A93B]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>

        {/* Secondary Links: Guide & Demo */}
        <div className="p-3 border-t border-[#1E2E40] space-y-1 bg-[#0A1118]">
          <Link
            to="/guide"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              location.pathname === '/guide' ? 'bg-[#101A24] text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-[#101A24]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Guide des 13 Fonctions</span>
          </Link>
          <Link
            to="/demo"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              location.pathname === '/demo' ? 'bg-[#101A24] text-[#F2A93B] border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-[#101A24]'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-[#F2A93B]" />
            <span>Démo 2 Min (/demo)</span>
          </Link>
        </div>

        {/* Network & Offline Status Footer */}
        <div className="p-4 border-t border-[#1E2E40] text-[11px] text-slate-400 flex items-center justify-between bg-[#080D13]">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300">En ligne (CADev 2026)</span>
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

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* HEADER */}
        <header className="bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 py-4 md:px-8 md:py-6 shadow-sm sticky top-0 z-30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Breadcrumbs */}
              {pathParts.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
                  <Link to="/" className="hover:text-[#0F6E56]">Accueil</Link>
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

            {/* Header Action Button */}
            {currentMeta.actionLabel && (
              <div className="shrink-0 flex items-center gap-3">
                {currentMeta.actionPath === 'ring_bell' && onOpenDoorbell ? (
                  <button
                    onClick={onOpenDoorbell}
                    className="btn-amber"
                  >
                    <Bell className="w-4 h-4 text-white animate-bell-swing" />
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

        {/* MAIN ROUTE CONTENT WITH SMOOTH FRAMER MOTION TRANSITIONS */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 px-4 py-6 md:px-8 md:py-10 max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM NAV BAR */}
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
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#F2A93B]' : 'text-slate-400'}`} />
              <span className="truncate max-w-[62px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

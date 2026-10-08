import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  FolderGit2,
  BookOpen,
  Sparkles,
  ArrowRight,
  Bell,
  CheckCircle2,
  Search,
  Users,
  Radar,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { apiFetch } from '../lib/api';
import { FALLBACK_SOLUTIONS, FALLBACK_PROJECTS, FALLBACK_USERS } from '../lib/mockData';
import { User, SolutionSheet, Project } from '@shared/index';

interface DiscoverPageProps {
  currentUser: User;
  onOpenDoorbell: () => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ currentUser, onOpenDoorbell }) => {
  const [solutions, setSolutions] = useState<SolutionSheet[]>(FALLBACK_SOLUTIONS);
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [users, setUsers] = useState<User[]>(FALLBACK_USERS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [sols, projs, usrs] = await Promise.all([
          apiFetch<SolutionSheet[]>('/solutions').catch(() => FALLBACK_SOLUTIONS),
          apiFetch<Project[]>('/projects').catch(() => FALLBACK_PROJECTS),
          apiFetch<User[]>('/users').catch(() => FALLBACK_USERS),
        ]);
        if (isMounted) {
          if (sols && sols.length > 0) setSolutions(sols);
          if (projs && projs.length > 0) setProjects(projs);
          if (usrs && usrs.length > 0) setUsers(usrs);
        }
      } catch (err) {
        console.warn('Utilisation des données locales résilientes:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const openNeighbors = users.filter((u) => u.doorOpen && u.id !== currentUser.id);

  const filteredSolutions = solutions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.stackTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Onboarding Checklist (Sleek light SaaS banner) */}
      <OnboardingChecklist currentUser={currentUser} />

      {/* 2. Hero Section: Refined Deep Navy Card with Emerald/Amber accents */}
      <div className="bg-gradient-to-br from-[#0A1118] via-[#101A24] to-[#0A1118] text-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#1E2E40] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-[#0F6E56]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-20 w-60 h-60 bg-[#F2A93B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#142332] rounded-full text-[11px] font-bold text-[#F2A93B] border border-amber-500/25">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quartier d’entraide technique ouest-africain • CADev 2026</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight text-white">
            Bloqué sur ton code ? Un voisin disponible te rejoint en <span className="text-[#F2A93B]">1 clic</span>.
          </h1>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal max-w-2xl">
            Résolution en direct via le mini-IDE collaboratif CodeFlash : confirmation par test automatisé, fiche de solution partagée et valorisation sur ton Passeport certifié.
          </p>

          {/* Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-[#101A24]/90 border border-[#1E2E40] p-3 rounded-xl">
              <p className="text-lg font-black text-white">{solutions.length}</p>
              <p className="text-[11px] font-medium text-slate-400">Fiches vérifiées</p>
            </div>
            <div className="bg-[#101A24]/90 border border-[#1E2E40] p-3 rounded-xl">
              <p className="text-lg font-black text-[#F2A93B] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {openNeighbors.length}
              </p>
              <p className="text-[11px] font-medium text-slate-400">Voisins en ligne</p>
            </div>
            <div className="bg-[#101A24]/90 border border-[#1E2E40] p-3 rounded-xl">
              <p className="text-lg font-black text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100%
              </p>
              <p className="text-[11px] font-medium text-slate-400">Preuves par test</p>
            </div>
            <div className="bg-[#101A24]/90 border border-[#1E2E40] p-3 rounded-xl">
              <p className="text-lg font-black text-white flex items-center gap-1">
                <Code2 className="w-4 h-4 text-[#F2A93B]" />
                0 Fuite
              </p>
              <p className="text-[11px] font-medium text-slate-400">Secrets masqués</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/ask"
              className="btn-amber py-2.5 px-5 text-xs font-bold"
            >
              <HelpCircle className="w-4 h-4 text-slate-900" />
              <span>Demander de l’aide (SOS Dev)</span>
            </Link>

            <button
              onClick={onOpenDoorbell}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <Bell className="w-3.5 h-3.5 text-[#F2A93B] animate-bell-swing" />
              <span>Sonner chez un voisin</span>
            </button>

            <Link
              to="/radar"
              className="px-4 py-2.5 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <span>Voir le Radar</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Quick Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/20 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une fiche solution, un problème (CORS, React, Express, useEffect, Docker)..."
          className="w-full text-xs md:text-sm text-slate-800 focus:outline-none placeholder-slate-400 font-normal"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2 shrink-0"
          >
            Effacer
          </button>
        )}
      </div>

      {/* 4. Main Grid: Left (Solutions & Projects) - Right (Neighbors & Radar CTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Solutions Section */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0F6E56]" />
                <span>Fiches solutions récentes</span>
              </h2>
              <Link to="/solutions" className="text-xs font-semibold text-[#0F6E56] hover:underline flex items-center gap-1">
                <span>Toutes les fiches ({solutions.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {filteredSolutions.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200/80 text-center space-y-2.5 shadow-2xs">
                <p className="text-xs text-slate-500">Aucune fiche solution trouvée pour « {searchQuery} ».</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-[#0F6E56] hover:underline"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSolutions.slice(0, 3).map((sol, index) => (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link
                      to={`/solutions/${sol.id}`}
                      className="bg-white p-5 rounded-xl border border-slate-200/80 hover:border-emerald-600 hover:shadow-md transition-all block group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-[#0F6E56] text-[11px] font-bold rounded-md border border-emerald-200">
                          {sol.stackTag}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(sol.publishedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 group-hover:text-[#0F6E56] transition-colors mb-1.5 text-sm md:text-base leading-snug">
                        {sol.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 mb-3.5 leading-relaxed font-normal">
                        {sol.problem}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100 flex-wrap gap-2">
                        <span className="flex items-center gap-1">
                          Co-rédigée par <strong className="text-slate-800">{sol.authorName}</strong> & <strong className="text-slate-800">{sol.helperName}</strong>
                        </span>
                        <span className="font-bold text-[#0F6E56] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0F6E56]" />
                          Confirmée par Test
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#0F6E56]" />
                <span>Projets en quête de coéquipiers</span>
              </h2>
              <Link to="/projects" className="text-xs font-semibold text-[#0F6E56] hover:underline flex items-center gap-1">
                <span>Tous les projets ({projects.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {projects.slice(0, 2).map((proj) => (
                <Link
                  key={proj.id}
                  to={`/projects/${proj.id}`}
                  className="bg-white p-4.5 rounded-xl border border-slate-200/80 hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#0F6E56] transition-colors">{proj.name}</h3>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {proj.city}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed font-normal">
                      {proj.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {proj.rolesNeeded.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-semibold rounded border border-amber-200/80">
                          {r}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#0F6E56] font-bold pt-2.5 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium">{proj.membersCount} membre(s)</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
                        Rejoindre le chantier
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Neighbors & Radar Quick Info */}
        <div className="space-y-5">
          {/* Neighbors with Door Open */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F6E56]" />
                <span>Voisins porte ouverte</span>
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 text-[#0F6E56] text-[10px] font-bold rounded-full border border-emerald-200">
                {openNeighbors.length} dispo
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-snug font-normal">
              Disponibles pour une session CodeFlash dès que tu sonnes à leur porte.
            </p>

            <div className="space-y-2">
              {openNeighbors.map((n) => (
                <div key={n.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <img src={n.avatar} alt={n.name} className="w-8 h-8 rounded-full object-cover border border-[#0F6E56]" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{n.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{n.city} • <span className="text-[#0F6E56]">{n.stack.slice(0, 2).join(', ')}</span></p>
                    </div>
                  </div>

                  <button
                    onClick={onOpenDoorbell}
                    className="p-1.5 text-[#F2A93B] hover:bg-amber-50 rounded-lg transition-colors"
                    title="Sonner à sa porte"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Radar Call to Action */}
          <div className="bg-gradient-to-br from-[#0A1118] via-[#101A24] to-[#0A1118] p-5 rounded-2xl text-white shadow-md space-y-2.5 border border-[#1E2E40] relative overflow-hidden">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-[#F2A93B] animate-pulse" />
              <h4 className="font-bold text-sm text-white">Radar des aidants</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Consulte les appels d’aide en direct et prête main-forte pour passer les tests au vert.
            </p>
            <Link
              to="/radar"
              className="btn-primary w-full justify-center text-xs py-2 mt-1"
            >
              <span>Accéder au Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

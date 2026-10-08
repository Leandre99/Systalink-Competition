import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Radar,
  Filter,
  Zap,
  Clock,
  CheckCircle2,
  ShieldCheck,
  DoorOpen,
  DoorClosed,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { HelpRequest, User } from '@shared/index';
import { apiFetch } from '../lib/api';
import { ListSkeleton } from '../components/Skeleton';

import { FALLBACK_REQUESTS } from '../lib/mockData';

interface RadarPageProps {
  currentUser: User;
  setCurrentUser: (u: User) => void;
}

const ALL_STACKS = ['Toutes', 'React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Flutter', 'Docker'];

export const RadarPage: React.FC<RadarPageProps> = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests, setRequests] = useState<HelpRequest[]>(FALLBACK_REQUESTS);
  const [loading, setLoading] = useState(false);
  const [selectedStack, setSelectedStack] = useState('Toutes');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const newRequestId = (location.state as any)?.newRequestId;

  const loadRequests = async () => {
    try {
      const res = await apiFetch<HelpRequest[]>('/help-requests');
      if (res && res.length > 0) setRequests(res);
    } catch (err) {
      console.warn('Utilisation des requêtes locales du Radar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDoor = async () => {
    const updated = await apiFetch<User>(`/users/${currentUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ doorOpen: !currentUser.doorOpen }),
    });
    setCurrentUser(updated);
  };

  const handleJoinRoom = async (req: HelpRequest) => {
    setJoiningId(req.id);
    try {
      const room = await apiFetch<any>('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          requestId: req.id,
          helperId: currentUser.id,
          helperName: currentUser.name,
        }),
      });
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      console.error('Erreur création salle:', err);
      setJoiningId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (r.status === 'resolved' || r.status === 'closed') return false;
    if (selectedStack === 'Toutes') return true;
    return r.stackTag.toLowerCase() === selectedStack.toLowerCase();
  });

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Visual Radar Screen & Live Status */}
      <div className="bg-[#0A1118] text-white rounded-3xl p-6 md:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Background Rotating Radar Screen Animation */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full border border-emerald-500/20 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-56 rounded-full border border-emerald-500/20 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border border-emerald-500/30 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-emerald-500/40"></div>
            </div>
          </div>
          {/* Radar Sweep Needle */}
          <div className="absolute inset-0 animate-radar-sweep pointer-events-none">
            <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent to-[#F2A93B] origin-right ml-auto"></div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#0A4F3E] text-[#F2A93B] border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-glow-emerald">
            <Radar className="w-7 h-7 animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                Radar des Aidants en Direct
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Scan Actif
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium max-w-xl">
              Détection en temps réel des développeurs bloqués sur le réseau ouest-africain (Cotonou, Dakar, Abidjan, Lomé).
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleToggleDoor}
            className={`py-2.5 px-5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg ${
              currentUser.doorOpen
                ? 'btn-primary'
                : 'bg-[#101A24] text-slate-300 hover:text-white border border-[#1E2E40]'
            }`}
          >
            {currentUser.doorOpen ? (
              <>
                <DoorOpen className="w-4 h-4 text-[#F2A93B]" />
                <span>Porte Ouverte aux Voisins</span>
              </>
            ) : (
              <>
                <DoorClosed className="w-4 h-4 text-slate-400" />
                <span>Ouvrir ma porte pour aider</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stack Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5 text-[#0F6E56]" />
          Filtrer par stack :
        </span>
        {ALL_STACKS.map((stack) => (
          <button
            key={stack}
            onClick={() => setSelectedStack(stack)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              selectedStack === stack
                ? 'bg-gradient-to-r from-[#0F6E56] to-[#0A4F3E] text-white border-emerald-500/40 shadow-glow-emerald'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            {stack}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div>
        {loading ? (
          <ListSkeleton count={3} />
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-[#0F6E56] border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-black text-[#0F172A] tracking-tight">Le Radar est calme !</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Aucune demande d’aide bloquée actuellement pour la technologie <strong className="text-slate-800">{selectedStack}</strong>. Tous les tests sont au vert.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const isNew = req.id === newRequestId;
              return (
                <div
                  key={req.id}
                  className={`card-modern p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                    isNew ? 'border-[#F2A93B] shadow-glow-amber ring-2 ring-[#F2A93B]/20' : ''
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200 shadow-sm">
                        {req.stackTag}
                      </span>
                      {req.secretsMaskedCount > 0 && (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 text-[10px] font-bold rounded-full border border-amber-200 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#F2A93B]" />
                          {req.secretsMaskedCount} secret(s) masqué(s)
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-base md:text-lg font-extrabold text-[#0F172A]">{req.title}</h4>
                    <p className="text-xs md:text-sm text-slate-600 line-clamp-2 font-medium leading-relaxed">{req.description}</p>

                    <div className="text-xs text-slate-500 flex items-center gap-2 pt-1 font-medium">
                      <span>Demandeur : <strong className="text-slate-900">{req.requesterName}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <button
                      onClick={() => handleJoinRoom(req)}
                      disabled={joiningId === req.id}
                      className="btn-amber py-3 px-5 text-xs shadow-glow-amber"
                    >
                      <Zap className="w-4 h-4 text-white" />
                      <span>{joiningId === req.id ? 'Ouverture de la salle...' : 'Rejoindre en CodeFlash (1 clic)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

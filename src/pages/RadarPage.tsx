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
} from 'lucide-react';
import { HelpRequest, User } from '@shared/index';
import { apiFetch } from '../lib/api';
import { ListSkeleton } from '../components/Skeleton';

interface RadarPageProps {
  currentUser: User;
  setCurrentUser: (u: User) => void;
}

const ALL_STACKS = ['Toutes', 'React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Flutter', 'Docker'];

export const RadarPage: React.FC<RadarPageProps> = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStack, setSelectedStack] = useState('Toutes');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const newRequestId = (location.state as any)?.newRequestId;

  const loadRequests = async () => {
    try {
      const res = await apiFetch<HelpRequest[]>('/help-requests');
      setRequests(res);
    } catch (err) {
      console.warn('Erreur chargement Radar:', err);
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
      {/* Top Banner: Door Open Toggle */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-blue-200 flex items-center justify-center shrink-0">
            <Radar className="w-6 h-6 animate-pulse-subtle" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <span>Radar des aidants en direct</span>
              {currentUser.doorOpen ? (
                <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#0F766E] text-xs font-extrabold rounded-full border border-emerald-200">
                  Disponibilité active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-300">
                  Porte fermée
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Reçois des notifications en direct lorsque quelqu’un poste une erreur correspondant à tes compétences.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleDoor}
          className={`btn-primary py-2.5 px-4 text-xs ${
            currentUser.doorOpen
              ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
              : 'bg-slate-800 text-white hover:bg-slate-900'
          }`}
        >
          {currentUser.doorOpen ? (
            <>
              <DoorOpen className="w-4 h-4 text-[#F59E0B]" />
              <span>Ma porte est ouverte</span>
            </>
          ) : (
            <>
              <DoorClosed className="w-4 h-4 text-slate-400" />
              <span>Ouvrir ma porte</span>
            </>
          )}
        </button>
      </div>

      {/* Stack Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
          Filtrer par stack :
        </span>
        {ALL_STACKS.map((stack) => (
          <button
            key={stack}
            onClick={() => setSelectedStack(stack)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              selectedStack === stack
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
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
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-[#2563EB]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#0F172A]">Le Radar est calme !</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Aucune demande d’aide en attente pour la technologie <span className="font-bold text-slate-700">{selectedStack}</span>.
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
                    isNew ? 'border-[#F59E0B] animate-slide-in shadow-md' : ''
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs font-extrabold rounded-full border border-blue-200">
                        {req.stackTag}
                      </span>
                      {req.secretsMaskedCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[10px] font-bold rounded border border-amber-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[#F59E0B]" />
                          Secrets masqués
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-[#0F172A]">{req.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 font-medium">{req.description}</p>

                    <div className="text-xs text-slate-500 flex items-center gap-2 pt-1 font-medium">
                      <span>Demandeur : <strong className="text-slate-800">{req.requesterName}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <button
                      onClick={() => handleJoinRoom(req)}
                      disabled={joiningId === req.id}
                      className="btn-primary py-2.5 px-5 text-xs"
                    >
                      <Zap className="w-4 h-4 text-[#F59E0B]" />
                      <span>{joiningId === req.id ? 'Rejointure...' : 'Rejoindre en CodeFlash'}</span>
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

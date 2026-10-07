import React, { useState } from 'react';
import { Bell, X, CheckCircle2, Sparkles, Volume2 } from 'lucide-react';
import { User } from '@shared/index';

interface DoorbellModalProps {
  isOpen: boolean;
  onClose: () => void;
  neighbors: User[];
  onRing: (neighbor: User) => void;
}

export const DoorbellModal: React.FC<DoorbellModalProps> = ({
  isOpen,
  onClose,
  neighbors,
  onRing,
}) => {
  const [selectedNeighbor, setSelectedNeighbor] = useState<User | null>(null);
  const [ringingState, setRingingState] = useState<'idle' | 'ringing' | 'notified'>('idle');

  if (!isOpen) return null;

  const handleRingNeighbor = (neighbor: User) => {
    setSelectedNeighbor(neighbor);
    setRingingState('ringing');
    setTimeout(() => {
      setRingingState('notified');
      onRing(neighbor);
    }, 1400);
  };

  const handleReset = () => {
    setSelectedNeighbor(null);
    setRingingState('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1118]/70 backdrop-blur-md flex items-center justify-center p-4 animate-page-enter">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 border border-emerald-500/20 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#F2A93B]/15 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6 text-[#F2A93B] animate-bell-swing" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
              <span>Sonner chez un voisin</span>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold">Keur & SOS</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Toque directement à la porte d’un développeur disponible prêt à t’aider.
            </p>
          </div>
        </div>

        {ringingState === 'idle' && (
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Voisins disponibles avec porte ouverte :
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {neighbors.filter((n) => n.doorOpen).length === 0 ? (
                <div className="p-5 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-medium border border-slate-200">
                  Aucun voisin n a sa porte ouverte actuellement. Publie ta demande sur /ask pour alerter tout le réseau !
                </div>
              ) : (
                neighbors
                  .filter((n) => n.doorOpen)
                  .map((neighbor) => (
                    <div
                      key={neighbor.id}
                      className="p-3.5 bg-[#F8FAF9] border border-slate-200/80 rounded-2xl flex items-center justify-between hover:border-emerald-500/50 hover:bg-emerald-50/20 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={neighbor.avatar}
                            alt={neighbor.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#0F6E56]"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0F172A]">{neighbor.name}</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {neighbor.city} • <span className="text-[#0F6E56] font-semibold">{neighbor.stack.slice(0, 3).join(', ')}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRingNeighbor(neighbor)}
                        className="btn-amber py-2 px-3 text-xs"
                      >
                        <Bell className="w-3.5 h-3.5 text-white" />
                        <span>Sonner</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {ringingState === 'ringing' && selectedNeighbor && (
          <div className="py-8 text-center space-y-4 relative z-10">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-doorbell-ring pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center border-2 border-[#F2A93B] shadow-glow-amber relative z-10">
                <Bell className="w-8 h-8 text-[#F2A93B] animate-bell-swing" />
              </div>
            </div>
            <h4 className="text-lg font-black text-[#0F172A] tracking-tight">
              Diiiiing-Dooong ! Sonnette envoyée 🔔
            </h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto font-medium">
              Notification sonore transmise à <strong className="text-[#0F172A]">{selectedNeighbor.name}</strong> ({selectedNeighbor.city}).
            </p>
          </div>
        )}

        {ringingState === 'notified' && selectedNeighbor && (
          <div className="py-6 text-center space-y-4 relative z-10">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center border-2 border-[#0F6E56] shadow-glow-emerald">
              <CheckCircle2 className="w-8 h-8 text-[#0F6E56]" />
            </div>
            <div>
              <h4 className="text-lg font-black text-[#0F172A]">
                {selectedNeighbor.name} a entendu la sonnette !
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto font-medium">
                Un canal d entraide est prêt. Tu peux le retrouver directement dans la salle CodeFlash ou sur le Radar.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="btn-primary w-full py-2.5 text-xs"
            >
              C est compris
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

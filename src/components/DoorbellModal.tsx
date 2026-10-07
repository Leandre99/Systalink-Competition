import React, { useState } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
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
    }, 1200);
  };

  const handleReset = () => {
    setSelectedNeighbor(null);
    setRingingState('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 border border-slate-200 relative overflow-hidden">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center">
            <Bell className="w-6 h-6 text-[#2563EB] animate-bell-swing" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#0F172A]">
              Sonner chez un voisin
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Alerte directement un développeur disponible qui maîtrise ta stack.
            </p>
          </div>
        </div>

        {ringingState === 'idle' && (
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Voisins disponibles avec porte ouverte :
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {neighbors.filter((n) => n.doorOpen).length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-medium border border-slate-200">
                  Aucun voisin n a sa porte ouverte actuellement. Publie ta demande sur /ask pour notifier le réseau.
                </div>
              ) : (
                neighbors
                  .filter((n) => n.doorOpen)
                  .map((neighbor) => (
                    <div
                      key={neighbor.id}
                      className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl flex items-center justify-between hover:border-[#2563EB] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={neighbor.avatar}
                          alt={neighbor.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#2563EB]"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-[#0F172A]">{neighbor.name}</h4>
                          <p className="text-xs text-slate-500">
                            {neighbor.city} • Stack : {neighbor.stack.slice(0, 3).join(', ')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRingNeighbor(neighbor)}
                        className="btn-primary py-2 px-3 text-xs"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Sonner</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {ringingState === 'ringing' && selectedNeighbor && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#EFF6FF] flex items-center justify-center border-2 border-[#2563EB]">
              <Bell className="w-8 h-8 text-[#2563EB] animate-bell-swing" />
            </div>
            <h4 className="text-lg font-extrabold text-[#0F172A]">
              Diiiiing-Dooong ! Sonnette en cours...
            </h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto font-medium">
              Envoi de la notification sonore à <span className="font-bold text-[#0F172A]">{selectedNeighbor.name}</span> à {selectedNeighbor.city}.
            </p>
          </div>
        )}

        {ringingState === 'notified' && selectedNeighbor && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center border-2 border-[#0F766E]">
              <CheckCircle2 className="w-8 h-8 text-[#0F766E]" />
            </div>
            <h4 className="text-lg font-extrabold text-[#0F172A]">
              Sonnette entendue par {selectedNeighbor.name} !
            </h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto font-medium">
              {selectedNeighbor.name} a reçu l alerte sonore sur son Radar. Tu vas recevoir un signal dès qu elle rejoint ta salle CodeFlash.
            </p>
            <button
              onClick={handleReset}
              className="btn-primary px-6"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

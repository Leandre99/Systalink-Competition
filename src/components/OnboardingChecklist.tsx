import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from 'lucide-react';
import { User } from '@shared/index';

interface OnboardingChecklistProps {
  currentUser: User;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ currentUser }) => {
  const [completedSteps] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('koradevs_onboarding');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('koradevs_onboarding_dismissed') === 'true';
  });

  const steps = [
    {
      id: 'step-1',
      title: '1. Compléter ta Maison',
      subtitle: 'Ajoute ta ville, ta bio et tes compétences',
      link: '/maison',
      isAutoCompleted: !!currentUser.city && currentUser.stack.length > 0,
    },
    {
      id: 'step-2',
      title: '2. Ouvrir ta porte aux voisins',
      subtitle: 'Active le statut "Porte Ouverte" sur ton profil',
      link: '/maison',
      isAutoCompleted: currentUser.doorOpen,
    },
    {
      id: 'step-3',
      title: '3. Explorer une fiche solution',
      subtitle: 'Consulte les fiches résolues par la communauté',
      link: '/solutions',
      isAutoCompleted: !!completedSteps['step-3'],
    },
    {
      id: 'step-4',
      title: '4. Faire ta première demande ou aide',
      subtitle: 'Pose une question sur /ask ou rejoins le Radar',
      link: '/ask',
      isAutoCompleted: !!completedSteps['step-4'] || currentUser.points > 100,
    },
  ];

  const completedCount = steps.filter((s) => s.isAutoCompleted || completedSteps[s.id]).length;
  const isAllDone = completedCount === steps.length;

  if (dismissed || isAllDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('koradevs_onboarding_dismissed', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-blue-600">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="font-black text-lg text-white tracking-tight">
              Bienvenue sur KoraDevs ! Ton onboarding en 4 étapes
            </h3>
          </div>
          <p className="text-xs text-blue-100 font-medium">
            Complète ces 4 étapes simples pour prendre en main ton quartier numérique d’entraide.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white p-1 rounded-xl hover:bg-blue-800/50 transition-colors"
          title="Masquer la checklist"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-blue-950/40 h-2 rounded-full overflow-hidden mb-5">
        <div
          className="bg-[#F59E0B] h-full transition-all duration-300"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        ></div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => {
          const isDone = step.isAutoCompleted || completedSteps[step.id];
          return (
            <Link
              key={step.id}
              to={step.link}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isDone
                  ? 'bg-blue-900/50 border-blue-400/40 text-blue-100'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-blue-100">{step.title}</span>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
                  ) : (
                    <Circle className="w-4 h-4 text-blue-300" />
                  )}
                </div>
                <p className="text-[11px] text-blue-100 leading-tight mb-3">
                  {step.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] mt-1">
                <span>{isDone ? 'Terminé' : 'Commencer'}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

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
      subtitle: 'Consulte les fiches confirmées par le test',
      link: '/solutions',
      isAutoCompleted: !!completedSteps['step-3'],
    },
    {
      id: 'step-4',
      title: '4. Première entraide CodeFlash',
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
    <div className="bg-gradient-to-r from-[#0A1118] via-[#0F6E56] to-[#0A4F3E] rounded-3xl p-6 md:p-8 text-white shadow-2xl mb-8 relative overflow-hidden border border-emerald-500/40">
      {/* Decorative Glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#F2A93B]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-[#F2A93B]/20 rounded-xl text-[#F2A93B] border border-[#F2A93B]/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-lg md:text-xl text-white tracking-tight">
              Bienvenue dans le quartier KoraDevs ! Ton onboarding en 4 étapes
            </h3>
          </div>
          <p className="text-xs text-emerald-100 font-medium">
            Progression : <strong className="text-[#F2A93B] font-black">{completedCount}/{steps.length} étapes</strong> validées pour maximiser ton impact communautaire.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="text-emerald-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          title="Masquer la checklist"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar with Amber Glow */}
      <div className="w-full bg-[#080D13]/60 h-2.5 rounded-full overflow-hidden mb-5 border border-emerald-500/20 relative z-10">
        <div
          className="bg-gradient-to-r from-[#F2A93B] to-[#FBBF24] h-full transition-all duration-500 rounded-full shadow-glow-amber"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        ></div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {steps.map((step) => {
          const isDone = step.isAutoCompleted || completedSteps[step.id];
          return (
            <Link
              key={step.id}
              to={step.link}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group ${
                isDone
                  ? 'bg-emerald-950/50 border-emerald-400/40 text-emerald-100 shadow-sm'
                  : 'bg-white/10 hover:bg-white/15 border-white/20 text-white hover:border-[#F2A93B]/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black tracking-tight">{step.title}</span>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#F2A93B] shrink-0" />
                  )}
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed font-medium">{step.subtitle}</p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#F2A93B] group-hover:translate-x-1 transition-transform">
                <span>{isDone ? 'Revoir' : 'Compléter'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

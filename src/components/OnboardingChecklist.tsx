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
      title: '1. Profil Maison',
      subtitle: 'Ajoute ta ville et ta stack technique',
      link: '/maison',
      isAutoCompleted: !!currentUser.city && currentUser.stack.length > 0,
    },
    {
      id: 'step-2',
      title: '2. Porte Ouverte',
      subtitle: 'Active ta disponibilité pour les voisins',
      link: '/maison',
      isAutoCompleted: currentUser.doorOpen,
    },
    {
      id: 'step-3',
      title: '3. Fiches Solutions',
      subtitle: 'Explore les solutions certifiées par test',
      link: '/solutions',
      isAutoCompleted: !!completedSteps['step-3'],
    },
    {
      id: 'step-4',
      title: '4. Session CodeFlash',
      subtitle: 'Demande de l’aide ou rejoins le Radar',
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
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-sm relative transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-[#F2A93B] shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-sm md:text-base text-slate-900 tracking-tight">
                Guide de démarrage KoraDevs
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#0F6E56] border border-emerald-200">
                {completedCount}/{steps.length} validées
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Quelques actions simples pour configurer ton espace et rejoindre le réseau d’entraide.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          title="Masquer le guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
        <div
          className="bg-gradient-to-r from-[#0F6E56] to-[#F2A93B] h-full transition-all duration-500 rounded-full"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step) => {
          const isDone = step.isAutoCompleted || completedSteps[step.id];
          return (
            <Link
              key={step.id}
              to={step.link}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between group ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200/70 text-slate-800'
                  : 'bg-slate-50 hover:bg-white hover:border-slate-300 border-slate-200/70 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{step.title}</span>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug font-medium">{step.subtitle}</p>
              </div>

              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-[#0F6E56] group-hover:text-emerald-700 transition-colors">
                <span>{isDone ? 'Vérifier' : 'Commencer'}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

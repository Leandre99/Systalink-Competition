import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: '1. Bienvenue dans ta Maison (/maison)',
    description: 'La Maison est ton espace personnel. Tu y indiques ta stack technique, ta ville et si ta porte est ouverte aux voisins bloqués.',
  },
  {
    step: 2,
    title: '2. Sonner chez un voisin (Appel à l’aide)',
    description: 'Quand tu es bloqué sur un bug, clique sur "Demander de l’aide" (/ask). Tes mots de passe et clés API sont automatiquement masqués avant tout envoi.',
  },
  {
    step: 3,
    title: '3. Le Radar des aidants (/radar)',
    description: 'Les aidants disponibles reçoivent l’alerte en direct sur leur Radar. Ils rejoignent la session d’entraide en un clic.',
  },
  {
    step: 4,
    title: '4. Salle d’entraide CodeFlash (/room)',
    description: 'Corrigez le code à deux en direct. Dès que le test passe au vert, la fiche solution est publiée avec le double accord.',
  },
  {
    step: 5,
    title: '5. Ton Passeport de compétences (/passport)',
    description: 'Chaque aide confirmée par un test alimente ton Passeport avec des preuves signées numériquement et exportables en PDF.',
  },
];

export const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 border-2 border-[#2563EB] relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-extrabold rounded-full border border-blue-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
            Visite guidée ({currentStep.step} / {TOUR_STEPS.length})
          </span>
        </div>

        <h3 className="text-xl font-extrabold text-[#0F172A] mb-2 tracking-tight">
          {currentStep.title}
        </h3>

        <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
          {currentStep.description}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
          <div
            className="bg-[#2563EB] h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          ></div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="btn-secondary py-2 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Précédent</span>
          </button>

          <button
            onClick={handleNext}
            className="btn-primary py-2 px-4 text-xs"
          >
            {isLast ? (
              <>
                <span>Terminer</span>
                <Check className="w-4 h-4 text-[#F59E0B]" />
              </>
            ) : (
              <>
                <span>Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

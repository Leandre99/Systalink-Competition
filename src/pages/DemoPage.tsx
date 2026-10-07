import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlayCircle,
  Users,
  HelpCircle,
  Radar,
  Zap,
  CheckCircle2,
  Award,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { User } from '@shared/index';
import { apiFetch } from '../lib/api';

interface DemoPageProps {
  currentUser: User;
  allUsers: User[];
  setCurrentUser: (u: User) => void;
}

const DEMO_STEPS = [
  {
    step: 1,
    title: 'Étape 1 : Demande d’aide & Masquage des secrets',
    roleNeeded: 'Demandeur (Koffi)',
    description: 'Koffi colle son erreur CORS. Les clés et mots de passe sont masqués automatiquement. Il vérifie l aperçu.',
    url: '/ask',
    icon: HelpCircle,
  },
  {
    step: 2,
    title: 'Étape 2 : Alerte sur le Radar des aidants',
    roleNeeded: 'Aidant (Aïcha)',
    description: 'Aïcha voit la nouvelle demande glisser sur son Radar en direct. Elle clique sur "Rejoindre en CodeFlash".',
    url: '/radar',
    icon: Radar,
  },
  {
    step: 3,
    title: 'Étape 3 : Salle CodeFlash & Édition partagée',
    roleNeeded: 'Binôme (Koffi + Aïcha)',
    description: 'Ils corrigent le code Express à deux en temps réel. Leurs curseurs només et le chat s affichent en direct.',
    url: '/room/room-demo',
    icon: Zap,
  },
  {
    step: 4,
    title: 'Étape 4 : Le test passe au vert !',
    roleNeeded: 'Binôme',
    description: 'Le test automatique est exécuté. Le badge "Confirmé" s anime en ambre et les points s incrémentent.',
    url: '/room/room-demo',
    icon: CheckCircle2,
  },
  {
    step: 5,
    title: 'Étape 5 : Fiche publiée, Passeport & WhatsApp',
    roleNeeded: 'Binôme',
    description: 'Avec le double accord, la fiche est publiée. Le Passeport d Aïcha s enrichit d une preuve certifiée exportable.',
    url: '/passport/user-aicha',
    icon: Award,
  },
];

export const DemoPage: React.FC<DemoPageProps> = ({ currentUser, allUsers, setCurrentUser }) => {
  const handleResetDemo = async () => {
    try {
      await apiFetch('/seed/reset', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Erreur réinitialisation démo:', err);
    }
  };

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-blue-600 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-extrabold text-[#F59E0B] border border-white/20">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Parcours Démo 2 Minutes (Jury / Évaluation)</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Déroulé étape par étape du scénario vedette</h2>
          <p className="text-xs text-blue-100 max-w-xl font-medium">
            Sélecteur de compte actif pour jouer le rôle du demandeur et de l aidant sur deux fenêtres d écran.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="btn-secondary py-2.5 px-4 text-xs font-bold border-white/30 bg-white/10 text-white hover:bg-white/25 shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-[#F59E0B]" />
          <span>Réinitialiser les données de démo</span>
        </button>
      </div>

      {/* Account Switcher Bar (Primary Blue Highlight) */}
      <div className="bg-white p-6 rounded-3xl border-2 border-[#2563EB] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <span>Sélecteur de compte de démonstration (Actif)</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Compte actuel : <strong>{currentUser.name}</strong></span>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Ouvre deux fenêtres de navigateur. Connecte l une sur <strong className="text-slate-900">Koffi Mensah</strong> (Demandeur) et l autre sur <strong className="text-slate-900">Aïcha Diop</strong> (Aidant) pour simuler la session en direct.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {allUsers.map((u) => {
            const isSelected = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                onClick={() => setCurrentUser(u)}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#2563EB] shadow-md ring-2 ring-[#2563EB]'
                    : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                }`}
              >
                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#2563EB]" />
                <div className="truncate">
                  <h4 className="text-xs font-extrabold text-[#0F172A] truncate">{u.name}</h4>
                  <p className="text-[10px] text-slate-500 font-medium capitalize">{u.role} • {u.city}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 Demo Scenario Steps */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-[#0F172A]">Les 5 étapes de la démonstration :</h3>

        <div className="space-y-4">
          {DEMO_STEPS.map((step) => {
            return (
              <div
                key={step.step}
                className="card-modern p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-blue-200 flex items-center justify-center shrink-0 font-black text-sm">
                    {step.step}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded uppercase">
                        {step.roleNeeded}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-[#0F172A]">{step.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{step.description}</p>
                  </div>
                </div>

                <Link
                  to={step.url}
                  className="btn-primary py-2.5 px-5 text-xs shrink-0"
                >
                  <span>Lancer cette étape</span>
                  <ArrowRight className="w-4 h-4 text-[#F59E0B]" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

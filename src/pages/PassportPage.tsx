import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Passport, User } from '@shared/index';
import { apiFetch } from '../lib/api';
import { generatePassportPDF } from '../lib/pdf';
import { ListSkeleton } from '../components/Skeleton';

interface PassportPageProps {
  currentUser: User;
}

export const PassportPage: React.FC<PassportPageProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const targetUserId = id || currentUser.id;

  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPassport() {
      try {
        const data = await apiFetch<Passport>(`/passport/${targetUserId}`);
        if (isMounted) setPassport(data);
      } catch (err) {
        console.warn('Erreur chargement Passeport:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPassport();
    return () => { isMounted = false; };
  }, [targetUserId]);

  if (loading) return <ListSkeleton count={3} />;

  if (!passport) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] text-center space-y-4 max-w-lg mx-auto shadow-sm">
        <h3 className="text-lg font-bold text-[#0F172A]">Passeport introuvable</h3>
        <p className="text-xs text-slate-500 font-medium">Aucun profil certifié disponible pour cet utilisateur.</p>
        <Link to="/" className="btn-primary py-2 text-xs inline-block">
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  const whatsappText = encodeURIComponent(
    `📜 Passeport de compétences certifié KoraDevs de ${passport.userName} (${passport.userCity}) !\nPoints : ${passport.points} Pts | Aides : ${passport.helpsCount}\nVoir le passeport vérifiable : ${window.location.href}`
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-page-enter">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {id && (
          <Link to="/passport" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0F6E56] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Mon propre Passeport</span>
          </Link>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-2.5 px-4 text-xs"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>Partager sur WhatsApp</span>
          </a>

          <button
            onClick={() => generatePassportPDF(passport)}
            className="btn-amber py-2.5 px-4 text-xs"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Exporter en PDF</span>
          </button>
        </div>
      </div>

      {/* Main Passport Document Card - Prestige Tech Certificate Design */}
      <div className="bg-white rounded-3xl border-2 border-[#0F6E56]/40 shadow-2xl overflow-hidden relative">
        {/* Top Banner (Navy Dark #0A1118 with Emerald and Gold Accents) */}
        <div className="bg-gradient-to-r from-[#0A1118] via-[#101A24] to-[#0A4F3E] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-[#F2A93B] relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-gradient-to-r from-[#0F6E56] to-[#0A4F3E] rounded-full text-xs font-black text-white shadow-sm border border-emerald-400/30 uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-[#F2A93B]" />
              <span>PASSEPORT DE COMPÉTENCES CERTIFIÉ (CADev 2026)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{passport.userName}</h2>
            <p className="text-xs text-emerald-200 font-medium">{passport.userCity} • {passport.bio}</p>
          </div>

          {/* Animated Gold/Amber "Signé" Seal */}
          <div className="shrink-0 flex items-center justify-center relative z-10">
            <div className="w-28 h-28 rounded-full border-4 border-[#F2A93B] bg-[#0A1118] flex flex-col items-center justify-center text-center shadow-glow-amber relative p-2">
              <svg className="absolute inset-0 w-full h-full pointer-events-none animate-seal-rotate" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#F2A93B"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </svg>
              <CheckCircle2 className="w-8 h-8 text-[#F2A93B] mb-0.5 animate-amber-spring" />
              <span className="text-[10px] font-black tracking-widest text-white uppercase">CERTIFIÉ</span>
              <span className="text-[8px] text-[#F2A93B] font-bold">KoraDevs</span>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="bg-[#F8FAF9] p-6 border-b border-slate-200 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-[#F2A93B]">{passport.points}</span>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Points Gagnés</p>
          </div>
          <div className="space-y-1 border-x border-slate-200">
            <span className="text-2xl md:text-3xl font-black text-[#0F6E56]">{passport.helpsCount}</span>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aides Confirmées</p>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-[#0A1118]">{passport.solutionsCount}</span>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fiches Publiées</p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 md:p-8 space-y-8">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stack Technique Validée :</h4>
            <div className="flex flex-wrap gap-2">
              {passport.stack.map((s) => (
                <span key={s} className="px-3.5 py-1 bg-emerald-50 text-[#0F6E56] text-xs font-black rounded-full border border-emerald-200 shadow-sm">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#0F6E56]" />
                <span>Preuves d entraide vérifiables ({passport.proofs.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Validées par test unitaire</span>
            </div>

            {passport.proofs.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-2xl font-medium">
                Aucune preuve enregistrée pour l instant. Participe à des sessions d entraide pour certifier tes compétences !
              </p>
            ) : (
              <div className="space-y-3">
                {passport.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="card-modern p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0F6E56] shrink-0" />
                        <h5 className="text-xs font-extrabold text-[#0F172A]">{proof.title}</h5>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-6 font-medium">{proof.detail}</p>
                      <p className="text-[10px] font-mono text-slate-400 pl-6">Hash cryptographique : {proof.hash}</p>
                    </div>

                    <Link
                      to={proof.url}
                      className="btn-secondary py-1.5 px-3.5 text-xs shrink-0"
                    >
                      <span>Vérifier</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cryptographic Signature Footer Box */}
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#F2A93B]" />
                Empreinte Numérique Infalsifiable
              </span>
              <span className="text-[10px] text-amber-700 font-bold">Horodaté sur le réseau KoraDevs</span>
            </div>
            <p className="font-mono text-[11px] text-amber-900 break-all pt-1 font-semibold">
              {passport.signatureHash}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

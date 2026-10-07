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
          <Link to="/passport" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#2563EB]">
            <ArrowLeft className="w-4 h-4" />
            <span>Mon propre Passeport</span>
          </Link>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-2 px-4 text-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span>Partager WhatsApp</span>
          </a>

          <button
            onClick={() => generatePassportPDF(passport)}
            className="btn-secondary py-2 px-4 text-xs border-blue-200 hover:bg-blue-50 text-[#2563EB]"
          >
            <Download className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* Main Passport Document Card */}
      <div className="bg-white rounded-3xl border-2 border-[#1E3A8A] shadow-2xl overflow-hidden relative">
        {/* Top Banner (Navy Dark #0F172A & Blue Accent) */}
        <div className="bg-[#0F172A] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-[#2563EB]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2563EB] rounded-full text-xs font-bold text-white shadow-sm">
              <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Passeport Numérique Certifié</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{passport.userName}</h2>
            <p className="text-xs text-slate-300 font-medium">{passport.userCity} • {passport.bio}</p>
          </div>

          {/* Animated SVG "Signé" Seal */}
          <div className="shrink-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-[#F59E0B] bg-[#1E3A8A] flex flex-col items-center justify-center text-center shadow-lg relative p-2">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3"
                  className="animate-seal-draw"
                />
              </svg>
              <CheckCircle2 className="w-8 h-8 text-[#F59E0B] mb-0.5" />
              <span className="text-[10px] font-black tracking-widest text-white uppercase">SIGNÉ</span>
              <span className="text-[8px] text-blue-200 font-bold">KoraDevs</span>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="bg-[#F8FAFC] p-6 border-b border-slate-200 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <span className="text-2xl font-black text-[#2563EB]">{passport.points}</span>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Points Gagnés</p>
          </div>
          <div className="space-y-1 border-x border-slate-200">
            <span className="text-2xl font-black text-[#2563EB]">{passport.helpsCount}</span>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aides Confirmées</p>
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-black text-[#2563EB]">{passport.solutionsCount}</span>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fiches Publiées</p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 md:p-8 space-y-8">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Stack Maîtrisée :</h4>
            <div className="flex flex-wrap gap-2">
              {passport.stack.map((s) => (
                <span key={s} className="px-3 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs font-extrabold rounded-full border border-blue-200">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#2563EB]" />
                <span>Preuves d entraide vérifiables ({passport.proofs.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Signatures cryptographiques</span>
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
                        <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                        <h5 className="text-xs font-extrabold text-[#0F172A]">{proof.title}</h5>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-6 font-medium">{proof.detail}</p>
                      <p className="text-[10px] font-mono text-slate-400 pl-6">Hash: {proof.hash}</p>
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
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                Empreinte Numérique Infalsifiable
              </span>
              <span className="text-[10px] text-amber-700 font-bold">Horodaté par KoraDevs</span>
            </div>
            <p className="font-mono text-[11px] text-amber-800 break-all pt-1">
              {passport.signatureHash}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

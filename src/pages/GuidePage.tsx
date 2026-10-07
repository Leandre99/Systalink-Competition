import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Compass,
  HelpCircle,
  Radar,
  FolderGit2,
  Award,
  Home,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Share2,
  Wifi,
} from 'lucide-react';

interface GuidePageProps {
  onStartTour: () => void;
}

const MVP_FEATURES = [
  {
    title: '1. Découvrir (Accueil)',
    url: '/discover',
    icon: Compass,
    description: 'La page d accueil qui rassemble les fiches de solutions récentes, les projets recruteurs et les voisins disponibles.',
  },
  {
    title: '2. Demander de l’aide',
    url: '/ask',
    icon: HelpCircle,
    description: 'Pose ta question et colle ton code. Tes clés API et mots de passe sont masqués automatiquement avant tout envoi.',
  },
  {
    title: '3. Radar des aidants',
    url: '/radar',
    icon: Radar,
    description: 'Le tableau de bord en direct où les développeurs aidants voient les requêtes bloquées correspondant à leur stack.',
  },
  {
    title: '4. Salle d’aide CodeFlash',
    url: '/room/room-demo',
    icon: Zap,
    description: 'Éditeur partagé et chat en temps réel avec curseurs colorés, indicateur de frappe et reconnexion automatique.',
  },
  {
    title: '5. Test confirmé',
    url: '/room/room-demo',
    icon: CheckCircle2,
    description: 'L exécution du test automatique fait passer la session au vert, attribue le badge "Confirmé" et crédite les points.',
  },
  {
    title: '6. Fiche solution & Recherche',
    url: '/solutions',
    icon: BookOpen,
    description: 'Chaque aide résolue devient une fiche savoir partagé, publiée avec l accord des deux personnes et recherchable.',
  },
  {
    title: '7. Vitrine de projets',
    url: '/projects',
    icon: FolderGit2,
    description: 'Présente tes projets personnels ou chantiers d équipe avec lien démo, dépôt Git et rôles recherchés.',
  },
  {
    title: '8. Rejoindre un projet & Kanban',
    url: '/projects',
    icon: FolderGit2,
    description: 'Bouton "Demander à rejoindre" avec formulaire d adhésion et mini-tableau de tâches Kanban par projet.',
  },
  {
    title: '9. Passeport signé & Export PDF',
    url: '/passport',
    icon: Award,
    description: 'Profil public de compétences avec preuves d entraide cliquables, sceau numérique animé et export PDF.',
  },
  {
    title: '10. Ma Maison (Profil vivant)',
    url: '/maison',
    icon: Home,
    description: 'Gère ta stack technique, ta ville et active ta porte ouverte pour que les voisins puissent te faire sonner.',
  },
  {
    title: '11. Signaler',
    url: '/solutions',
    icon: ShieldCheck,
    description: 'Bouton de modération disponible sur les fiches et projets pour signaler les doublons ou contenus inappropriés.',
  },
  {
    title: '12. Partage WhatsApp',
    url: '/passport',
    icon: Share2,
    description: 'Partage en un clic d une fiche solution, d un projet ou d un Passeport certifié via WhatsApp.',
  },
  {
    title: '13. Appli légère (PWA & Offline)',
    url: '/',
    icon: Wifi,
    description: 'Application installable avec gestion de file hors-ligne "En attente de synchronisation" lors du retour du réseau.',
  },
];

export const GuidePage: React.FC<GuidePageProps> = ({ onStartTour }) => {
  return (
    <div className="space-y-8 animate-page-enter">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-blue-600 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-extrabold text-[#F59E0B] border border-white/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Plan complet du Quartier KoraDevs</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Guide interactif des 13 fonctionnalités MVP</h2>
          <p className="text-xs text-blue-100 max-w-xl font-medium">
            Chaque fonctionnalité est reliée de bout en bout et immédiatement utilisable sur la plateforme.
          </p>
        </div>

        <button
          onClick={onStartTour}
          className="btn-primary bg-[#F59E0B] hover:bg-amber-500 text-slate-950 font-black text-xs py-3 px-6 shadow-lg border-0 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>Lancer la visite guidée (5 infobulles)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MVP_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="card-modern p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-blue-200 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-[#0F172A] text-sm">{feat.title}</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {feat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
                <Link
                  to={feat.url}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline"
                >
                  <span>Accéder directement</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

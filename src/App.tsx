import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { GuidedTour } from './components/GuidedTour';
import { DoorbellModal } from './components/DoorbellModal';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import { DiscoverPage } from './pages/DiscoverPage';
import { AskPage } from './pages/AskPage';
import { RadarPage } from './pages/RadarPage';
import { CodeFlashPage } from './pages/CodeFlashPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { PassportPage } from './pages/PassportPage';
import { MaisonPage } from './pages/MaisonPage';
import { GuidePage } from './pages/GuidePage';
import { DemoPage } from './pages/DemoPage';

import { User } from '@shared/index';
import { apiFetch } from './lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-koffi',
    name: 'Koffi Mensah',
    email: 'koffi@koradevs.bj',
    city: 'Cotonou',
    stack: ['React', 'Node.js', 'TypeScript', 'Tailwind'],
    bio: 'Développeur Fullstack junior à Cotonou.',
    doorOpen: true,
    points: 120,
    role: 'demandeur',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  });

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isDoorbellOpen, setIsDoorbellOpen] = useState(false);

  useEffect(() => {
    apiFetch<User[]>('/users')
      .then((users) => {
        setAllUsers(users);
        const koffi = users.find((u) => u.id === 'user-koffi');
        if (koffi) setCurrentUser(koffi);
      })
      .catch((err) => console.warn('Erreur chargement utilisateurs:', err));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onOpenDoorbell={() => setIsDoorbellOpen(true)}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DiscoverPage currentUser={currentUser} onOpenDoorbell={() => setIsDoorbellOpen(true)} />} />
              <Route path="/discover" element={<DiscoverPage currentUser={currentUser} onOpenDoorbell={() => setIsDoorbellOpen(true)} />} />
              <Route path="/ask" element={<AskPage currentUser={currentUser} />} />
              <Route path="/radar" element={<RadarPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
              <Route path="/room/:id" element={<CodeFlashPage currentUser={currentUser} />} />
              
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/solutions/:id" element={<SolutionsPage />} />
              
              <Route path="/projects" element={<ProjectsPage currentUser={currentUser} />} />
              <Route path="/projects/:id" element={<ProjectsPage currentUser={currentUser} />} />
              
              <Route path="/passport" element={<PassportPage currentUser={currentUser} />} />
              <Route path="/passport/:id" element={<PassportPage currentUser={currentUser} />} />
              
              <Route path="/maison" element={<MaisonPage currentUser={currentUser} setCurrentUser={setCurrentUser} onOpenDoorbell={() => setIsDoorbellOpen(true)} />} />
              <Route path="/guide" element={<GuidePage onStartTour={() => setIsTourOpen(true)} />} />
              <Route path="/demo" element={<DemoPage currentUser={currentUser} allUsers={allUsers} setCurrentUser={setCurrentUser} />} />
              
              <Route path="*" element={<Navigate to="/discover" replace />} />
            </Routes>
          </ErrorBoundary>

          {/* Global Modals */}
          <GuidedTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
          <DoorbellModal
            isOpen={isDoorbellOpen}
            onClose={() => setIsDoorbellOpen(false)}
            neighbors={allUsers.filter((u) => u.id !== currentUser.id)}
            onRing={(neighbor) => console.log('Sonnette activée pour:', neighbor.name)}
          />
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

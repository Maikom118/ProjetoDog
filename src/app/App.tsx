import { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CaregiversList } from './components/CaregiversList';
import { CaregiverProfile } from './components/CaregiverProfile';
import { Cuidador } from '../lib/api';

export interface CaregiverFilters {
  city?: string;
  maxPrice?: string;
  specialty?: string;
  name?: string;
  bestMatchId?: string;
  preloadedCuidadores?: Cuidador[]; // lista pré-carregada pelo endpoint de match
  petName?: string; // nome do pet para exibir banner
}

function getUserRole(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const raw =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      payload.role ||
      payload.roles ||
      payload.Role ||
      payload.tipo ||
      payload.userType ||
      null;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  } catch {
    return null;
  }
}

type Page = 'login' | 'dashboard' | 'caregivers' | 'caregiver-profile';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const token = localStorage.getItem('token');
    return token ? 'dashboard' : 'login';
  });
  const [userRole, setUserRole] = useState<string | null>(() => getUserRole());
  const [selectedCaregiver, setSelectedCaregiver] = useState<Cuidador | null>(null);
  const [caregiverFilters, setCaregiverFilters] = useState<CaregiverFilters>({});

  const handleLogin = () => {
    setUserRole(getUserRole());
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserRole(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page: string, filters?: CaregiverFilters) => {
    if (filters) setCaregiverFilters(filters);
    setCurrentPage(page as Page);
  };

  const handleViewCaregiverProfile = (cuidador: Cuidador) => {
    setSelectedCaregiver(cuidador);
    setCurrentPage('caregiver-profile');
  };

  return (
    <>
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'dashboard' && (
        <Dashboard
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          userRole={userRole}
        />
      )}
      {currentPage === 'caregivers' && (
        <CaregiversList
          onBack={() => { setCaregiverFilters({}); setCurrentPage('dashboard'); }}
          onViewProfile={handleViewCaregiverProfile}
          initialFilters={caregiverFilters}
        />
      )}
      {currentPage === 'caregiver-profile' && selectedCaregiver && (
        <CaregiverProfile
          cuidador={selectedCaregiver}
          onBack={() => setCurrentPage('caregivers')}
        />
      )}
      <Toaster position="top-right" richColors />
    </>
  );
}

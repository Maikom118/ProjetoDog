import { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CaregiversList } from './components/CaregiversList';

function getUserRole(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.tipo || payload.userType || null;
  } catch {
    return null;
  }
}

type Page = 'login' | 'dashboard' | 'caregivers';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const token = localStorage.getItem('token');
    return token ? 'dashboard' : 'login';
  });
  const [userRole, setUserRole] = useState<string | null>(() => getUserRole());

  const handleLogin = () => {
    setUserRole(getUserRole());
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserRole(null);
    setCurrentPage('login');
  };

  return (
    <>
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'dashboard' && (
        <Dashboard
          onLogout={handleLogout}
          onNavigate={(page: string) => setCurrentPage(page as Page)}
          userRole={userRole}
        />
      )}
      {currentPage === 'caregivers' && (
        <CaregiversList onBack={() => setCurrentPage('dashboard')} />
      )}
      <Toaster position="top-right" richColors />
    </>
  );
}